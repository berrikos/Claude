"""Uber Eats API client for merchant operations."""

import time
from typing import Any, Optional

import httpx

from uber_eats_agent.config import (
    UBER_EATS_API_BASE_V1,
    UBER_EATS_API_BASE_V2,
    UBER_EATS_AUTH_URL,
    UBER_EATS_CLIENT_ID,
    UBER_EATS_CLIENT_SECRET,
    UBER_EATS_SCOPES,
)
from uber_eats_agent.models.data_models import (
    MenuCategory,
    MenuItem,
    Modifier,
    ModifierGroup,
    Order,
    OrderIssue,
    Store,
)


class UberEatsAPIError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(f"Uber Eats API error ({status_code}): {message}")


class UberEatsClient:
    """Client for interacting with the Uber Eats merchant API."""

    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
    ):
        self.client_id = client_id or UBER_EATS_CLIENT_ID
        self.client_secret = client_secret or UBER_EATS_CLIENT_SECRET
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0
        self._http = httpx.Client(
            timeout=30.0,
            headers={"Accept-Encoding": "gzip"},
        )

    def _ensure_authenticated(self) -> None:
        """Obtain or refresh the OAuth2 access token (valid for 30 days)."""
        if self._access_token and time.time() < self._token_expires_at - 60:
            return

        if not self.client_id or not self.client_secret:
            raise UberEatsAPIError(
                401,
                "Missing UBER_EATS_CLIENT_ID or UBER_EATS_CLIENT_SECRET. "
                "Set them in your .env file.",
            )

        resp = self._http.post(
            UBER_EATS_AUTH_URL,
            data={
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials",
                "scope": UBER_EATS_SCOPES,
            },
        )

        if resp.status_code != 200:
            raise UberEatsAPIError(resp.status_code, resp.text)

        data = resp.json()
        self._access_token = data["access_token"]
        self._token_expires_at = time.time() + data.get("expires_in", 2592000)

    def _request(
        self,
        method: str,
        url: str,
        params: Optional[dict] = None,
        json_body: Optional[dict] = None,
    ) -> Any:
        """Make an authenticated request to the Uber Eats API."""
        self._ensure_authenticated()

        resp = self._http.request(
            method,
            url,
            headers={"Authorization": f"Bearer {self._access_token}"},
            params=params,
            json=json_body,
        )

        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", "5"))
            time.sleep(retry_after)
            return self._request(method, url, params, json_body)

        if resp.status_code >= 400:
            raise UberEatsAPIError(resp.status_code, resp.text)

        return resp.json()

    # ── Stores (v1) ─────────────────────────────────────────────────

    def get_stores(self) -> list[Store]:
        """Fetch all stores owned by the authenticated merchant.

        Uses cursor-based pagination (next_key) to handle large store counts.
        """
        all_stores: list[Store] = []
        next_key: Optional[str] = None

        while True:
            params: dict[str, Any] = {}
            if next_key:
                params["next_key"] = next_key

            data = self._request("GET", f"{UBER_EATS_API_BASE_V1}/stores", params=params)

            stores_list = data.get("stores", data if isinstance(data, list) else [])
            for s in stores_list:
                location = s.get("location", {})
                all_stores.append(
                    Store(
                        id=s.get("store_id", s.get("uuid", "")),
                        name=s.get("name", "Unknown"),
                        address=location.get("address", location.get("address1", "")),
                        status=s.get("status", ""),
                        is_online=s.get("is_online", False),
                        raw_data=s,
                    )
                )

            next_key = data.get("next_key")
            if not next_key:
                break

        return all_stores

    # ── Menu (v2) ───────────────────────────────────────────────────

    def get_menu(self, store_id: str) -> list[MenuCategory]:
        """Fetch the full menu for a store using the v2 menu endpoint."""
        data = self._request("GET", f"{UBER_EATS_API_BASE_V2}/stores/{store_id}/menus")

        categories: list[MenuCategory] = []
        menus = data.get("menus", data if isinstance(data, list) else [data])

        for menu in menus:
            # v2 menus use entity-based structure with category_ids referencing
            # category_entities, which in turn reference item_entities
            category_entities = menu.get("category_entities", {})
            item_entities = menu.get("item_entities", {})
            modifier_group_entities = menu.get("modifier_group_entities", {})

            # If entity-based structure
            if category_entities:
                for cat_id, cat in category_entities.items():
                    cat_obj = MenuCategory(
                        id=cat_id,
                        title=cat.get("title", cat.get("name", "Uncategorized")),
                    )
                    for item_id in cat.get("item_ids", []):
                        item_data = item_entities.get(item_id, {})
                        if not item_data:
                            continue
                        menu_item = self._parse_menu_item(
                            item_data, item_id, cat_obj.id, cat_obj.title,
                            modifier_group_entities,
                        )
                        cat_obj.items.append(menu_item)
                    categories.append(cat_obj)
            else:
                # Fallback for flat category/item structure
                for cat in menu.get("categories", []):
                    if isinstance(cat, str):
                        continue
                    cat_obj = MenuCategory(
                        id=cat.get("id", cat.get("uuid", "")),
                        title=cat.get("title", cat.get("name", "Uncategorized")),
                    )
                    for item in cat.get("items", []):
                        if isinstance(item, str):
                            continue
                        menu_item = self._parse_menu_item(
                            item, item.get("id", ""), cat_obj.id, cat_obj.title, {},
                        )
                        cat_obj.items.append(menu_item)
                    categories.append(cat_obj)

        return categories

    def _parse_menu_item(
        self,
        item: dict,
        item_id: str,
        category_id: str,
        category_name: str,
        modifier_group_entities: dict,
    ) -> MenuItem:
        price_info = item.get("price_info", item.get("price", {}))
        if isinstance(price_info, dict):
            price = price_info.get("price", price_info.get("amount", 0)) / 100
        elif isinstance(price_info, (int, float)):
            price = price_info / 100
        else:
            price = 0.0

        # Parse modifier groups — in v2, items reference modifier_group_ids
        modifier_groups = []
        mg_ids = item.get("modifier_group_ids", {})
        if isinstance(mg_ids, dict):
            for mg_id in mg_ids:
                mg_data = modifier_group_entities.get(mg_id, mg_ids.get(mg_id, {}))
                if not mg_data or isinstance(mg_data, str):
                    continue
                group = ModifierGroup(
                    id=mg_id,
                    title=mg_data.get("title", mg_data.get("name", "")),
                    min_selection=mg_data.get("minimum_selection", mg_data.get("min_permitted", 0)),
                    max_selection=mg_data.get("maximum_selection", mg_data.get("max_permitted", 1)),
                )
                # Modifier options are items themselves in v2
                for mod_item_id in mg_data.get("item_ids", []):
                    mod_data = mg_data.get("modifier_options", {}).get(mod_item_id, {})
                    if not mod_data:
                        mod_data = {"title": mod_item_id}
                    mod_price = mod_data.get("price_info", mod_data.get("price", {}))
                    if isinstance(mod_price, dict):
                        mod_p = mod_price.get("price", mod_price.get("amount", 0)) / 100
                    elif isinstance(mod_price, (int, float)):
                        mod_p = mod_price / 100
                    else:
                        mod_p = 0.0
                    group.modifiers.append(
                        Modifier(
                            id=mod_item_id,
                            title=mod_data.get("title", mod_data.get("name", "")),
                            price=mod_p,
                        )
                    )
                modifier_groups.append(group)

        # Check suspension/availability
        suspension = item.get("suspension_info", {})
        is_available = not suspension.get("is_suspended", False) if suspension else item.get("is_available", True)

        return MenuItem(
            id=item_id,
            title=item.get("title", item.get("name", "")),
            description=item.get("description", ""),
            price=price,
            image_url=item.get("image_url"),
            category_id=category_id,
            category_name=category_name,
            modifier_groups=modifier_groups,
            is_available=is_available,
        )

    # ── Orders (v1) ─────────────────────────────────────────────────

    def get_order(self, order_id: str) -> Order:
        """Fetch a single order by ID."""
        data = self._request("GET", f"{UBER_EATS_API_BASE_V1}/orders/{order_id}")
        return self._parse_order(data, data.get("store", {}).get("store_id", ""))

    # ── Reports (v1) ────────────────────────────────────────────────

    def get_report(
        self,
        store_ids: list[str],
        report_type: str,
        start_date: str,
        end_date: str,
    ) -> dict:
        """Request an analytics report via POST /v1/eats/report.

        Args:
            store_ids: List of store UUIDs to include.
            report_type: One of: ORDER_HISTORY, INACCURATE_ORDERS,
                TOP_INACCURATE_ITEMS, DOWNTIME, CUSTOMER_FEEDBACK,
                DELIVERY_FEEDBACK, MENU_ITEM_FEEDBACK, TOP_ITEMS_NOT_FOUND.
            start_date: Start date (YYYY-MM-DD), max 31-day range.
            end_date: End date (YYYY-MM-DD).
        """
        return self._request(
            "POST",
            f"{UBER_EATS_API_BASE_V1}/report",
            json_body={
                "report_type": report_type,
                "store_uuids": store_ids,
                "start_date": start_date,
                "end_date": end_date,
            },
        )

    def get_orders_from_report(
        self,
        store_ids: list[str],
        start_date: str,
        end_date: str,
    ) -> list[Order]:
        """Fetch order history for stores using the reports endpoint.

        Since the Uber Eats API delivers orders via webhooks (not a list endpoint),
        this uses the ORDER_HISTORY report to get historical order data.
        """
        data = self.get_report(store_ids, "ORDER_HISTORY", start_date, end_date)

        orders: list[Order] = []
        for row in data.get("orders", data.get("report_data", data if isinstance(data, list) else [])):
            if isinstance(row, dict):
                order = self._parse_order(row, row.get("store_id", store_ids[0] if store_ids else ""))
                orders.append(order)

        return orders

    def get_store_feedback(
        self,
        store_ids: list[str],
        start_date: str,
        end_date: str,
    ) -> dict:
        """Get customer feedback report for stores."""
        return self.get_report(store_ids, "CUSTOMER_FEEDBACK", start_date, end_date)

    def get_inaccurate_orders(
        self,
        store_ids: list[str],
        start_date: str,
        end_date: str,
    ) -> dict:
        """Get inaccurate orders report."""
        return self.get_report(store_ids, "INACCURATE_ORDERS", start_date, end_date)

    def get_top_inaccurate_items(
        self,
        store_ids: list[str],
        start_date: str,
        end_date: str,
    ) -> dict:
        """Get top inaccurate items report."""
        return self.get_report(store_ids, "TOP_INACCURATE_ITEMS", start_date, end_date)

    def get_downtime_report(
        self,
        store_ids: list[str],
        start_date: str,
        end_date: str,
    ) -> dict:
        """Get store downtime report."""
        return self.get_report(store_ids, "DOWNTIME", start_date, end_date)

    def _parse_order(self, o: dict, store_id: str) -> Order:
        items = []
        cart_items = o.get("items", [])
        if not cart_items:
            for cart in o.get("carts", []):
                cart_items.extend(cart.get("items", []))

        for item in cart_items:
            items.append(
                {
                    "name": item.get("title", item.get("name", "")),
                    "quantity": item.get("quantity", 1),
                    "price": item.get("price", {}).get("amount", 0) / 100
                    if isinstance(item.get("price"), dict)
                    else (item.get("price", 0) / 100 if isinstance(item.get("price"), (int, float)) else 0),
                    "special_instructions": item.get("special_instructions", ""),
                    "modifiers": [
                        m.get("title", m.get("name", ""))
                        for m in item.get("selected_modifier_groups", item.get("modifiers", []))
                        if isinstance(m, dict)
                    ],
                }
            )

        issues = []
        for issue in o.get("issues", o.get("order_issues", [])):
            issues.append(
                OrderIssue(
                    order_id=o.get("id", o.get("order_id", o.get("uuid", ""))),
                    issue_type=issue.get("type", issue.get("issue_type", "unknown")),
                    description=issue.get("description", issue.get("reason", "")),
                    timestamp=issue.get("created_at", issue.get("timestamp")),
                    item_name=issue.get("item_name"),
                    resolution=issue.get("resolution"),
                )
            )

        # Handle payment object structure
        payment = o.get("payment", {})
        total_info = o.get("total", payment.get("total", 0))
        if isinstance(total_info, dict):
            total = total_info.get("amount", 0) / 100
        elif isinstance(total_info, (int, float)):
            total = total_info / 100
        else:
            total = 0.0

        return Order(
            id=o.get("id", o.get("order_id", o.get("uuid", ""))),
            store_id=store_id,
            status=o.get("status", o.get("state", "")),
            total=total,
            items=items,
            placed_at=o.get("placed_at", o.get("created_at")),
            completed_at=o.get("completed_at"),
            issues=issues,
            customer_rating=o.get("rating", {}).get("value") if isinstance(o.get("rating"), dict) else o.get("rating"),
            raw_data=o,
        )

    def close(self) -> None:
        self._http.close()
