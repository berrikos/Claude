"""Analyze store-level performance and health."""

from uber_eats_agent.models.data_models import Order, Store, StoreAnalysis, MenuCategory


def build_store_analysis(
    store: Store,
    categories: list[MenuCategory],
    orders: list[Order],
) -> StoreAnalysis:
    """Aggregate store-level metrics from menu and order data."""
    total_revenue = sum(o.total for o in orders)
    total_orders = len(orders)
    avg_order_value = total_revenue / total_orders if total_orders else 0.0

    ratings = [o.customer_rating for o in orders if o.customer_rating is not None]
    avg_rating = sum(ratings) / len(ratings) if ratings else None

    issue_count = sum(len(o.issues) for o in orders)

    return StoreAnalysis(
        store=store,
        menu_categories=categories,
        orders=orders,
        total_revenue=round(total_revenue, 2),
        avg_order_value=round(avg_order_value, 2),
        total_orders=total_orders,
        issue_count=issue_count,
        avg_rating=round(avg_rating, 2) if avg_rating else None,
    )


def summarize_store(analysis: StoreAnalysis) -> dict:
    """Produce a summary dict suitable for display or AI input."""
    total_items = sum(len(c.items) for c in analysis.menu_categories)
    unavailable = sum(
        1 for c in analysis.menu_categories for i in c.items if not i.is_available
    )
    items_without_desc = sum(
        1
        for c in analysis.menu_categories
        for i in c.items
        if not i.description or len(i.description.strip()) < 10
    )
    items_without_image = sum(
        1
        for c in analysis.menu_categories
        for i in c.items
        if not i.image_url
    )

    # Price statistics
    prices = [i.price for c in analysis.menu_categories for i in c.items if i.price > 0]
    avg_price = sum(prices) / len(prices) if prices else 0
    min_price = min(prices) if prices else 0
    max_price = max(prices) if prices else 0

    # Order issue breakdown
    issue_types: dict[str, int] = {}
    for o in analysis.orders:
        for issue in o.issues:
            issue_types[issue.issue_type] = issue_types.get(issue.issue_type, 0) + 1

    # Most/least ordered items
    item_order_counts: dict[str, int] = {}
    for o in analysis.orders:
        for item in o.items:
            name = item.get("name", "Unknown")
            item_order_counts[name] = item_order_counts.get(name, 0) + item.get("quantity", 1)

    sorted_items = sorted(item_order_counts.items(), key=lambda x: x[1], reverse=True)

    return {
        "store_name": analysis.store.name,
        "store_id": analysis.store.id,
        "store_status": analysis.store.status,
        "is_online": analysis.store.is_online,
        "total_menu_items": total_items,
        "unavailable_items": unavailable,
        "items_missing_description": items_without_desc,
        "items_missing_image": items_without_image,
        "avg_item_price": round(avg_price, 2),
        "min_item_price": round(min_price, 2),
        "max_item_price": round(max_price, 2),
        "total_orders": analysis.total_orders,
        "total_revenue": analysis.total_revenue,
        "avg_order_value": analysis.avg_order_value,
        "avg_rating": analysis.avg_rating,
        "issue_count": analysis.issue_count,
        "issue_breakdown": issue_types,
        "top_10_items": sorted_items[:10],
        "bottom_10_items": sorted_items[-10:] if len(sorted_items) > 10 else sorted_items,
        "categories": [
            {
                "name": c.title,
                "item_count": len(c.items),
                "items": [
                    {
                        "name": i.title,
                        "price": i.price,
                        "description": i.description[:100] if i.description else "",
                        "has_image": bool(i.image_url),
                        "is_available": i.is_available,
                        "modifier_group_count": len(i.modifier_groups),
                        "modifiers": [
                            {
                                "group": mg.title,
                                "options": [
                                    {"name": m.title, "price": m.price}
                                    for m in mg.modifiers
                                ],
                            }
                            for mg in i.modifier_groups
                        ],
                    }
                    for i in c.items
                ],
            }
            for c in analysis.menu_categories
        ],
    }
