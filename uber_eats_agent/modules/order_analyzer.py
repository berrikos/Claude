"""Order analysis: issues, trends, performance metrics."""

from collections import Counter
from uber_eats_agent.models.data_models import Order


def analyze_orders(orders: list[Order]) -> dict:
    """Analyze order data for patterns, issues, and opportunities."""
    if not orders:
        return {
            "total_orders": 0,
            "message": "No order data available for analysis.",
            "findings": [],
        }

    findings: list[dict] = []

    # Basic metrics
    total_revenue = sum(o.total for o in orders)
    avg_order_value = total_revenue / len(orders)
    ratings = [o.customer_rating for o in orders if o.customer_rating is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else None

    # Issue analysis
    all_issues = [issue for o in orders for issue in o.issues]
    issue_type_counts = Counter(i.issue_type for i in all_issues)
    issue_rate = len([o for o in orders if o.issues]) / len(orders) * 100

    if issue_rate > 10:
        findings.append({
            "type": "issues",
            "severity": "high",
            "message": (
                f"Order issue rate is {issue_rate:.1f}% — "
                "target should be under 5%. This significantly impacts store ranking."
            ),
        })

    # Break down issue types
    for issue_type, count in issue_type_counts.most_common(5):
        findings.append({
            "type": "issues",
            "severity": "medium",
            "message": (
                f"'{issue_type}' issues occurred {count} times "
                f"({count / len(orders) * 100:.1f}% of orders)."
            ),
        })

    # Items involved in issues
    issue_items = Counter(
        i.item_name for i in all_issues if i.item_name
    )
    for item_name, count in issue_items.most_common(5):
        findings.append({
            "type": "issues",
            "severity": "medium",
            "message": (
                f"Item '{item_name}' has been involved in {count} issue(s). "
                "Review preparation quality or description accuracy."
            ),
        })

    # Item popularity
    item_counts: Counter[str] = Counter()
    item_revenue: dict[str, float] = {}
    for o in orders:
        for item in o.items:
            name = item.get("name", "Unknown")
            qty = item.get("quantity", 1)
            price = item.get("price", 0)
            item_counts[name] += qty
            item_revenue[name] = item_revenue.get(name, 0) + price * qty

    top_items = item_counts.most_common(10)
    bottom_items = item_counts.most_common()[-10:] if len(item_counts) > 10 else []

    # Revenue concentration
    if item_revenue:
        sorted_revenue = sorted(item_revenue.values(), reverse=True)
        top_20_pct_count = max(1, len(sorted_revenue) // 5)
        top_20_pct_revenue = sum(sorted_revenue[:top_20_pct_count])
        if total_revenue > 0 and top_20_pct_revenue / total_revenue > 0.8:
            findings.append({
                "type": "revenue",
                "severity": "medium",
                "message": (
                    "80%+ of revenue comes from the top 20% of items. "
                    "Consider promoting underperforming items or removing low sellers."
                ),
            })

    # Order value distribution
    low_value_orders = [o for o in orders if o.total < avg_order_value * 0.5]
    if low_value_orders and len(low_value_orders) / len(orders) > 0.2:
        findings.append({
            "type": "order_value",
            "severity": "medium",
            "message": (
                f"{len(low_value_orders)} orders ({len(low_value_orders) / len(orders) * 100:.0f}%) "
                f"are below half the average (${avg_order_value:.2f}). "
                "Consider bundles or minimum order incentives."
            ),
        })

    # Rating analysis
    if ratings:
        low_ratings = [r for r in ratings if r <= 3]
        if low_ratings and len(low_ratings) / len(ratings) > 0.15:
            findings.append({
                "type": "ratings",
                "severity": "high",
                "message": (
                    f"{len(low_ratings)} orders ({len(low_ratings) / len(ratings) * 100:.0f}%) "
                    f"received 3 stars or below. Average rating: {avg_rating:.1f}/5."
                ),
            })

    # Modifier usage
    orders_with_mods = 0
    for o in orders:
        for item in o.items:
            if item.get("modifiers"):
                orders_with_mods += 1
                break
    mod_rate = orders_with_mods / len(orders) * 100 if orders else 0
    if mod_rate < 30:
        findings.append({
            "type": "modifiers",
            "severity": "low",
            "message": (
                f"Only {mod_rate:.0f}% of orders include modifiers. "
                "Better-positioned modifiers can increase order values."
            ),
        })

    # Special instructions frequency
    special_instr_count = sum(
        1 for o in orders for item in o.items if item.get("special_instructions")
    )
    if special_instr_count > len(orders) * 0.2:
        common_instructions: Counter[str] = Counter()
        for o in orders:
            for item in o.items:
                instr = item.get("special_instructions", "").strip()
                if instr:
                    common_instructions[instr.lower()] += 1
        top_instructions = common_instructions.most_common(5)
        findings.append({
            "type": "special_instructions",
            "severity": "low",
            "message": (
                f"Frequent special instructions detected ({special_instr_count} total). "
                "Top requests: "
                + ", ".join(f"'{instr}' ({cnt}x)" for instr, cnt in top_instructions)
                + ". Consider adding these as menu modifiers."
            ),
        })

    return {
        "total_orders": len(orders),
        "total_revenue": round(total_revenue, 2),
        "avg_order_value": round(avg_order_value, 2),
        "avg_rating": round(avg_rating, 1) if avg_rating else None,
        "issue_rate_pct": round(issue_rate, 1),
        "issue_breakdown": dict(issue_type_counts.most_common()),
        "top_items": top_items,
        "bottom_items": bottom_items,
        "modifier_usage_pct": round(mod_rate, 1),
        "findings": findings,
    }
