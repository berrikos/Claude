from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Modifier:
    id: str
    title: str
    price: float
    external_id: Optional[str] = None


@dataclass
class ModifierGroup:
    id: str
    title: str
    min_selection: int = 0
    max_selection: int = 1
    modifiers: list[Modifier] = field(default_factory=list)


@dataclass
class MenuItem:
    id: str
    title: str
    description: str
    price: float
    image_url: Optional[str] = None
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    modifier_groups: list[ModifierGroup] = field(default_factory=list)
    is_available: bool = True
    external_id: Optional[str] = None


@dataclass
class MenuCategory:
    id: str
    title: str
    items: list[MenuItem] = field(default_factory=list)


@dataclass
class Store:
    id: str
    name: str
    address: Optional[str] = None
    status: Optional[str] = None
    is_online: bool = False
    raw_data: dict = field(default_factory=dict)


@dataclass
class OrderIssue:
    order_id: str
    issue_type: str
    description: str
    timestamp: Optional[str] = None
    item_name: Optional[str] = None
    resolution: Optional[str] = None


@dataclass
class Order:
    id: str
    store_id: str
    status: str
    total: float
    items: list[dict] = field(default_factory=list)
    placed_at: Optional[str] = None
    completed_at: Optional[str] = None
    issues: list[OrderIssue] = field(default_factory=list)
    customer_rating: Optional[float] = None
    raw_data: dict = field(default_factory=dict)


@dataclass
class StoreAnalysis:
    store: Store
    menu_categories: list[MenuCategory] = field(default_factory=list)
    orders: list[Order] = field(default_factory=list)
    total_revenue: float = 0.0
    avg_order_value: float = 0.0
    total_orders: int = 0
    issue_count: int = 0
    avg_rating: Optional[float] = None
