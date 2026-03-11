"""Deep menu analysis: pricing, descriptions, modifiers, completeness."""

from uber_eats_agent.models.data_models import MenuCategory, MenuItem


def analyze_menu(categories: list[MenuCategory]) -> dict:
    """Perform detailed menu analysis and surface potential issues."""
    all_items = [item for cat in categories for item in cat.items]
    findings: list[dict] = []

    _check_pricing(all_items, findings)
    _check_descriptions(all_items, findings)
    _check_images(all_items, findings)
    _check_modifiers(all_items, findings)
    _check_availability(all_items, findings)
    _check_category_balance(categories, findings)

    return {
        "total_items": len(all_items),
        "total_categories": len(categories),
        "findings": findings,
    }


def _check_pricing(items: list[MenuItem], findings: list[dict]) -> None:
    prices = [i.price for i in items if i.price > 0]
    if not prices:
        return

    avg = sum(prices) / len(prices)
    std_dev = (sum((p - avg) ** 2 for p in prices) / len(prices)) ** 0.5

    for item in items:
        if item.price <= 0:
            findings.append({
                "type": "pricing",
                "severity": "high",
                "item": item.title,
                "message": f"Item '{item.title}' has a price of ${item.price:.2f} — likely misconfigured.",
            })
        elif item.price > avg + 2 * std_dev:
            findings.append({
                "type": "pricing",
                "severity": "medium",
                "item": item.title,
                "message": (
                    f"Item '{item.title}' (${item.price:.2f}) is significantly above "
                    f"average (${avg:.2f}). Consider if this is intentional."
                ),
            })
        elif item.price < avg - 2 * std_dev and item.price > 0:
            findings.append({
                "type": "pricing",
                "severity": "medium",
                "item": item.title,
                "message": (
                    f"Item '{item.title}' (${item.price:.2f}) is significantly below "
                    f"average (${avg:.2f}). May be underpriced."
                ),
            })

    # Check for common price endings
    non_99_count = sum(1 for p in prices if round(p % 1, 2) not in (0.99, 0.95, 0.49, 0.00))
    if non_99_count > len(prices) * 0.3:
        findings.append({
            "type": "pricing",
            "severity": "low",
            "item": "multiple",
            "message": (
                f"{non_99_count}/{len(prices)} items have unconventional price "
                "endings. Consider using .99 or .95 endings for perceived value."
            ),
        })


def _check_descriptions(items: list[MenuItem], findings: list[dict]) -> None:
    no_desc = [i for i in items if not i.description or len(i.description.strip()) < 5]
    short_desc = [
        i for i in items
        if i.description and 5 <= len(i.description.strip()) < 30
    ]

    if no_desc:
        findings.append({
            "type": "description",
            "severity": "high",
            "item": ", ".join(i.title for i in no_desc[:5]),
            "message": (
                f"{len(no_desc)} items have no description. "
                "Items with descriptions get significantly more orders on delivery apps."
            ),
        })
    if short_desc:
        findings.append({
            "type": "description",
            "severity": "medium",
            "item": ", ".join(i.title for i in short_desc[:5]),
            "message": (
                f"{len(short_desc)} items have very short descriptions (<30 chars). "
                "Consider adding ingredients, preparation method, or flavor profile."
            ),
        })


def _check_images(items: list[MenuItem], findings: list[dict]) -> None:
    no_image = [i for i in items if not i.image_url]
    if no_image:
        pct = len(no_image) / len(items) * 100 if items else 0
        findings.append({
            "type": "image",
            "severity": "high" if pct > 50 else "medium",
            "item": ", ".join(i.title for i in no_image[:5]),
            "message": (
                f"{len(no_image)} items ({pct:.0f}%) have no image. "
                "Items with photos convert at 2-3x higher rates on Uber Eats."
            ),
        })


def _check_modifiers(items: list[MenuItem], findings: list[dict]) -> None:
    no_modifiers = [i for i in items if not i.modifier_groups]
    if no_modifiers and len(no_modifiers) > len(items) * 0.5:
        findings.append({
            "type": "modifiers",
            "severity": "medium",
            "item": "multiple",
            "message": (
                f"{len(no_modifiers)}/{len(items)} items have no modifiers. "
                "Adding modifiers (size, extras, sides) can increase average order value."
            ),
        })

    # Check for free modifiers that could be charged
    for item in items:
        for mg in item.modifier_groups:
            free_mods = [m for m in mg.modifiers if m.price == 0]
            if len(free_mods) == len(mg.modifiers) and len(mg.modifiers) > 2:
                findings.append({
                    "type": "modifiers",
                    "severity": "low",
                    "item": item.title,
                    "message": (
                        f"All modifiers in '{mg.title}' for '{item.title}' are free. "
                        "Consider charging for premium options to increase revenue."
                    ),
                })


def _check_availability(items: list[MenuItem], findings: list[dict]) -> None:
    unavailable = [i for i in items if not i.is_available]
    if unavailable:
        pct = len(unavailable) / len(items) * 100 if items else 0
        findings.append({
            "type": "availability",
            "severity": "high" if pct > 20 else "medium",
            "item": ", ".join(i.title for i in unavailable[:5]),
            "message": (
                f"{len(unavailable)} items ({pct:.0f}%) are marked unavailable. "
                "High unavailability hurts store ranking and customer experience."
            ),
        })


def _check_category_balance(categories: list[MenuCategory], findings: list[dict]) -> None:
    if not categories:
        return

    sizes = [len(c.items) for c in categories]
    avg_size = sum(sizes) / len(sizes) if sizes else 0

    for cat in categories:
        if len(cat.items) > avg_size * 3 and len(cat.items) > 15:
            findings.append({
                "type": "category",
                "severity": "low",
                "item": cat.title,
                "message": (
                    f"Category '{cat.title}' has {len(cat.items)} items — "
                    "consider splitting into subcategories for better browsability."
                ),
            })
        elif len(cat.items) <= 1:
            findings.append({
                "type": "category",
                "severity": "low",
                "item": cat.title,
                "message": (
                    f"Category '{cat.title}' has only {len(cat.items)} item(s). "
                    "Consider merging with another category."
                ),
            })
