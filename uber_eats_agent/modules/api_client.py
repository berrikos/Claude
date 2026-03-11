"""Uber Eats API client for merchant operations."""

import time
from typing import Any, Optional

import httpx

from uber_eats_agent.config import (
    UBER_EATS_API_BASE,
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
        self._http = httpx.Client(timeout=30.0)

    def _ensure_authenticated(self) -> None:
        """Obtain or refresh the OAuth2 access token."""
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
        self._token_expires_at = time.time() + data.get("expires_in", 3600)

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        json_body: Optional[dict] = None,
    ) -> Any:
        """Make an authenticated request to the Uber Eats API."""
        self._ensure_authenticated()

        url = f"{UBER_EATS_API_BASE}{path}"
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
            return self._request(method, path, params, json_body)

        if resp.status_code >= 400:
            raise UberEatsAPIError(resp.status_code, resp.text)

        return resp.json()

    # ── Stores ──────────────────────────────────────────────────────

    def get_stores(self) -> list[Store]:
        """Fetch all stores owned by the authenticated merchant."""
        data = self._request("GET", "/stores")
        stores = []
        for s in data.get("stores", data if isinstance(data, list) else []):
            stores.append(
                Store(
                    id=s.get("store_id", s.get("uuid", "")),
                    name=s.get("name", "Unknown"),
                    address=s.get("address", {}).get("address1", ""),
                    status=s.get("status", ""),
                    is_online=s.get("is_online", False),
                    raw_data=s,
                )
            )
        return stores

    # ── Menu ────────────────────────────────────────────────────────

    def get_menu(self, store_id: str) -> list[MenuCategory]:
        """Fetch the full menu for a store."""
        data = self._request("GET", f"/stores/{store_id}/menus")

        categories: list[MenuCategory] = []
        menus = data.get("menus", data if isinstance(data, list) else [data])

        for menu in menus:
            for cat in menu.get("categories", menu.get("category_entities", {}).values() if isinstance(menu, dict) else []):
                if isinstance(cat, str):
                    continue
                cat_obj = MenuCategory(
                    id=cat.get("id", cat.get("uuid", "")),
                    title=cat.get("title", cat.get("name", "Uncategorized")),
                )
                for item in cat.get("items", cat.get("entities", [])):
                    if isinstance(item, str):
                        continue
                    menu_item = self._parse_menu_item(item, cat_obj.id, cat_obj.title)
                    cat_obj.items.append(menu_item)
                categories.append(cat_obj)

        return categories

    def _parse_menu_item(
        self, item: dict, category_id: str, category_name: str
    ) -> MenuItem:
        price_info = item.get("price_info", item.get("price", {}))
        if isinstance(price_info, dict):
            price = price_info.get("price", price_info.get("amount", 0)) / 100
        elif isinstance(price_info, (int, float)):
            price = price_info / 100
        else:
            price = 0.0

        modifier_groups = []
        for mg in item.get("modifier_groups", item.get("modifier_group_ids", {}).values() if isinstance(item.get("modifier_group_ids"), dict) else []):
            if isinstance(mg, str):
                continue
            group = ModifierGroup(
                id=mg.get("id", mg.get("uuid", "")),
                title=mg.get("title", mg.get("name", "")),
                min_selection=mg.get("minimum_selection", mg.get("min_permitted", 0)),
                max_selection=mg.get("maximum_selection", mg.get("max_permitted", 1)),
            )
            for mod in mg.get("modifiers", mg.get("modifier_options", [])):
                if isinstance(mod, str):
                    continue
                mod_price = mod.get("price_info", mod.get("price", {}))
                if isinstance(mod_price, dict):
                    mod_p = mod_price.get("price", mod_price.get("amount", 0)) / 100
                elif isinstance(mod_price, (int, float)):
                    mod_p = mod_price / 100
                else:
                    mod_p = 0.0
                group.modifiers.append(
                    Modifier(
                        id=mod.get("id", mod.get("uuid", "")),
                        title=mod.get("title", mod.get("name", "")),
                        price=mod_p,
                    )
                )
            modifier_groups.append(group)

        return MenuItem(
            id=item.get("id", item.get("uuid", "")),
            title=item.get("title", item.get("name", "")),
            description=item.get("description", ""),
            price=price,
            image_url=item.get("image_url", item.get("photo", {}).get("url") if isinstance(item.get("photo"), dict) else None),
            category_id=category_id,
            category_name=category_name,
            modifier_groups=modifier_groups,
            is_available=item.get("is_available", item.get("enabled", True)),
        )

    # ── Orders ──────────────────────────────────────────────────────

    def get_orders(
        self,
        store_id: str,
        status: Optional[str] = None,
        limit: int = 50,
    ) -> list[Order]:
        """Fetch orders for a store."""
        params: dict[str, Any] = {"limit": limit}
        if status:
            params["status"] = status

        all_orders: list[Order] = []
        next_key: Optional[str] = None

        while True:
            if next_key:
                params["next_key"] = next_key
            data = self._request(
                "GET", f"/stores/{store_id}/orders", params=params
            )

            orders_list = data.get("orders", data if isinstance(data, list) else [])
            for o in orders_list:
                order = self._parse_order(o, store_id)
                all_orders.append(order)

            next_key = data.get("next_key")
            if not next_key or len(all_orders) >= 500:
                break

        return all_orders

    def _parse_order(self, o: dict, store_id: str) -> Order:
        items = []
        for item in o.get("items", o.get("cart", {}).get("items", [])):
            items.append(
                {
                    "name": item.get("title", item.get("name", "")),
                    "quantity": item.get("quantity", 1),
                    "price": item.get("price", {}).get("amount", 0) / 100
                    if isinstance(item.get("price"), dict)
                    else (item.get("price", 0) / 100 if isinstance(item.get("price"), (int, float)) else 0),
                    "special_instructions": item.get(
                        "special_instructions", ""
                    ),
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
                    order_id=o.get("id", o.get("uuid", "")),
                    issue_type=issue.get("type", issue.get("issue_type", "unknown")),
                    description=issue.get("description", issue.get("reason", "")),
                    timestamp=issue.get("created_at", issue.get("timestamp")),
                    item_name=issue.get("item_name"),
                    resolution=issue.get("resolution"),
                )
            )

        total_info = o.get("total", o.get("payment", {}).get("total", 0))
        if isinstance(total_info, dict):
            total = total_info.get("amount", 0) / 100
        elif isinstance(total_info, (int, float)):
            total = total_info / 100
        else:
            total = 0.0

        return Order(
            id=o.get("id", o.get("uuid", "")),
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

    # ── Reports / Analytics ─────────────────────────────────────────

    def get_store_report(
        self, store_id: str, start_date: str, end_date: str
    ) -> dict:
        """Fetch analytics/report data for a store within a date range."""
        params = {"start_date": start_date, "end_date": end_date}
        return self._request(
            "GET", f"/stores/{store_id}/report", params=params
        )

    def close(self) -> None:
        self._http.close()
