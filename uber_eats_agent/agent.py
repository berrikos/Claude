"""Main Uber Eats Analysis Agent — orchestrates data collection, analysis, and recommendations."""

import sys
from datetime import datetime, timedelta

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.markdown import Markdown

from uber_eats_agent.modules.api_client import UberEatsClient, UberEatsAPIError
from uber_eats_agent.modules.store_analyzer import build_store_analysis, summarize_store
from uber_eats_agent.modules.menu_analyzer import analyze_menu
from uber_eats_agent.modules.order_analyzer import analyze_orders
from uber_eats_agent.modules.recommendation_engine import (
    generate_recommendations,
    generate_item_recommendations,
)

console = Console()


def run_agent() -> None:
    """Run the full Uber Eats analysis pipeline."""
    console.print(
        Panel.fit(
            "[bold blue]Uber Eats Business Analysis Agent[/bold blue]\n"
            "Analyzes your stores, menus, and orders to provide actionable recommendations.",
            border_style="blue",
        )
    )

    # Initialize API client
    try:
        client = UberEatsClient()
    except Exception as e:
        console.print(f"[red]Failed to initialize API client: {e}[/red]")
        sys.exit(1)

    try:
        _run_analysis(client)
    except UberEatsAPIError as e:
        console.print(f"\n[red]API Error: {e}[/red]")
        console.print(
            "[yellow]Check your API credentials in the .env file and ensure "
            "you have the correct permissions.[/yellow]"
        )
        sys.exit(1)
    except KeyboardInterrupt:
        console.print("\n[yellow]Analysis cancelled.[/yellow]")
        sys.exit(0)
    finally:
        client.close()


def _run_analysis(client: UberEatsClient) -> None:
    """Core analysis pipeline."""
    # Step 1: Fetch stores
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Fetching your stores...", total=None)
        stores = client.get_stores()
        progress.update(task, description=f"Found {len(stores)} store(s)")

    if not stores:
        console.print("[red]No stores found. Check your API credentials and permissions.[/red]")
        return

    # Display stores
    store_table = Table(title="Your Uber Eats Stores")
    store_table.add_column("#", style="dim")
    store_table.add_column("Store Name", style="bold")
    store_table.add_column("Status")
    store_table.add_column("Online")
    store_table.add_column("Address")

    for i, store in enumerate(stores, 1):
        status_style = "green" if store.status == "active" else "red"
        online_style = "green" if store.is_online else "red"
        store_table.add_row(
            str(i),
            store.name,
            f"[{status_style}]{store.status}[/{status_style}]",
            f"[{online_style}]{'Yes' if store.is_online else 'No'}[/{online_style}]",
            store.address or "N/A",
        )

    console.print(store_table)
    console.print()

    # Step 2: Analyze each store
    for i, store in enumerate(stores, 1):
        console.rule(f"[bold]Store {i}/{len(stores)}: {store.name}[/bold]")

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            # Fetch menu
            menu_task = progress.add_task(f"Fetching menu for {store.name}...", total=None)
            categories = client.get_menu(store.id)
            total_items = sum(len(c.items) for c in categories)
            progress.update(
                menu_task,
                description=f"Menu loaded: {len(categories)} categories, {total_items} items",
            )

            # Fetch orders via reports API (last 31 days)
            order_task = progress.add_task(f"Fetching order history for {store.name}...", total=None)
            end_date = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=31)).strftime("%Y-%m-%d")
            orders = client.get_orders_from_report([store.id], start_date, end_date)
            progress.update(
                order_task,
                description=f"Loaded {len(orders)} orders (last 31 days)",
            )

            # Fetch additional reports
            report_task = progress.add_task(f"Fetching feedback & issue reports...", total=None)
            extra_reports = {}
            for report_type in ["CUSTOMER_FEEDBACK", "INACCURATE_ORDERS", "TOP_INACCURATE_ITEMS", "DOWNTIME"]:
                try:
                    extra_reports[report_type] = client.get_report(
                        [store.id], report_type, start_date, end_date
                    )
                except Exception:
                    extra_reports[report_type] = {}
            progress.update(report_task, description="Reports loaded")

        # Build analysis
        console.print("\n[bold]Analyzing store data...[/bold]")
        store_analysis = build_store_analysis(store, categories, orders)
        store_summary = summarize_store(store_analysis)
        menu_analysis = analyze_menu(categories)
        order_analysis = analyze_orders(orders)

        # Display key metrics
        _display_metrics(store_summary, order_analysis)

        # Display menu findings
        if menu_analysis["findings"]:
            _display_findings("Menu Analysis Findings", menu_analysis["findings"])

        # Display order findings
        if order_analysis.get("findings"):
            _display_findings("Order Analysis Findings", order_analysis["findings"])

        # Generate AI recommendations
        console.print("\n[bold blue]Generating AI-powered recommendations...[/bold blue]")
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            rec_task = progress.add_task("Claude is analyzing your data...", total=None)
            recommendations = generate_recommendations(
                store_summary, menu_analysis, order_analysis, extra_reports
            )
            progress.update(rec_task, description="Recommendations ready!")

        console.print()
        console.print(Panel(Markdown(recommendations), title="[bold green]Recommendations[/bold green]", border_style="green"))

        # Generate per-item recommendations if there are items
        all_items = []
        for cat in store_summary.get("categories", []):
            for item in cat.get("items", []):
                all_items.append(item)

        if all_items:
            console.print("\n[bold blue]Generating item-level recommendations...[/bold blue]")
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                console=console,
            ) as progress:
                item_task = progress.add_task("Analyzing individual items...", total=None)
                # Process in batches of 20
                for batch_start in range(0, len(all_items), 20):
                    batch = all_items[batch_start : batch_start + 20]
                    item_recs = generate_item_recommendations(batch)
                    progress.update(
                        item_task,
                        description=f"Analyzed {min(batch_start + 20, len(all_items))}/{len(all_items)} items",
                    )
                    console.print()
                    console.print(
                        Panel(
                            Markdown(item_recs),
                            title=f"[bold cyan]Item Recommendations (batch {batch_start // 20 + 1})[/bold cyan]",
                            border_style="cyan",
                        )
                    )

        console.print()

    console.print(
        Panel.fit(
            "[bold green]Analysis complete![/bold green]\n"
            "Review the recommendations above and implement changes in your "
            "Uber Eats Merchant Dashboard.",
            border_style="green",
        )
    )


def _display_metrics(summary: dict, order_analysis: dict) -> None:
    """Display key performance metrics in a table."""
    metrics_table = Table(title="Key Metrics", show_header=False)
    metrics_table.add_column("Metric", style="bold")
    metrics_table.add_column("Value")

    metrics_table.add_row("Total Menu Items", str(summary["total_menu_items"]))
    metrics_table.add_row("Unavailable Items", str(summary["unavailable_items"]))
    metrics_table.add_row("Items Missing Description", str(summary["items_missing_description"]))
    metrics_table.add_row("Items Missing Image", str(summary["items_missing_image"]))
    metrics_table.add_row("Avg Item Price", f"${summary['avg_item_price']:.2f}")
    metrics_table.add_row("Price Range", f"${summary['min_item_price']:.2f} – ${summary['max_item_price']:.2f}")
    metrics_table.add_row("", "")
    metrics_table.add_row("Total Orders", str(summary["total_orders"]))
    metrics_table.add_row("Total Revenue", f"${summary['total_revenue']:.2f}")
    metrics_table.add_row("Avg Order Value", f"${summary['avg_order_value']:.2f}")
    metrics_table.add_row(
        "Avg Rating",
        f"{summary['avg_rating']}/5" if summary["avg_rating"] else "N/A",
    )
    metrics_table.add_row("Order Issues", str(summary["issue_count"]))
    metrics_table.add_row(
        "Issue Rate",
        f"{order_analysis.get('issue_rate_pct', 0):.1f}%",
    )
    metrics_table.add_row(
        "Modifier Usage",
        f"{order_analysis.get('modifier_usage_pct', 0):.0f}%",
    )

    console.print(metrics_table)

    # Top items
    if summary.get("top_10_items"):
        top_table = Table(title="Top 10 Most Ordered Items")
        top_table.add_column("#", style="dim")
        top_table.add_column("Item")
        top_table.add_column("Orders", justify="right")
        for rank, (name, count) in enumerate(summary["top_10_items"], 1):
            top_table.add_row(str(rank), name, str(count))
        console.print(top_table)


def _display_findings(title: str, findings: list[dict]) -> None:
    """Display analysis findings with severity coloring."""
    findings_table = Table(title=title)
    findings_table.add_column("Severity", width=8)
    findings_table.add_column("Type", width=15)
    findings_table.add_column("Finding")

    severity_colors = {"high": "red", "medium": "yellow", "low": "blue"}

    for f in sorted(findings, key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x.get("severity", "low"), 3)):
        color = severity_colors.get(f.get("severity", "low"), "white")
        findings_table.add_row(
            f"[{color}]{f.get('severity', 'low').upper()}[/{color}]",
            f.get("type", ""),
            f.get("message", ""),
        )

    console.print(findings_table)


if __name__ == "__main__":
    run_agent()
