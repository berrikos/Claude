// ═══════════════════════════════════════
//   MENU TYPES (processed from Square Catalog)
// ═══════════════════════════════════════

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  categoryId: string;
  variations: MenuItemVariation[];
  modifierLists: ModifierList[];
  dietaryTags: string[];
  spicyLevel: number;
  isFeatured: boolean;
  isAvailable: boolean;
  sortOrder: number;
}

export interface MenuItemVariation {
  id: string;
  name: string;
  priceCents: number;
}

export interface ModifierList {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  minSelected: number;
  maxSelected: number | null;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  priceCents: number;
}

// ═══════════════════════════════════════
//   CART TYPES
// ═══════════════════════════════════════

export interface CartItem {
  id: string; // unique cart item ID (generated)
  menuItemId: string;
  variationId: string;
  name: string;
  variationName: string;
  quantity: number;
  basePriceCents: number;
  selectedModifiers: SelectedModifier[];
  specialInstructions: string;
  imageUrl: string | null;
}

export interface SelectedModifier {
  modifierListId: string;
  modifierListName: string;
  modifierId: string;
  name: string;
  priceCents: number;
}

// ═══════════════════════════════════════
//   ORDER TYPES
// ═══════════════════════════════════════

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type FulfillmentType = "pickup" | "curbside";

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  pickupAt: string | null;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  items: OrderItemSummary[];
  createdAt: string;
}

export interface OrderItemSummary {
  name: string;
  quantity: number;
  basePrice: number;
  modifierTotal: number;
  modifiers: SelectedModifier[];
}

// ═══════════════════════════════════════
//   LOCATION TYPES
// ═══════════════════════════════════════

export interface RestaurantLocation {
  id: string;
  squareLocationId: string;
  name: string;
  address: {
    addressLine1?: string;
    addressLine2?: string;
    locality?: string;
    administrativeDistrictLevel1?: string;
    postalCode?: string;
    country?: string;
  } | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  businessHours: BusinessHours | null;
  pickupEnabled: boolean;
  curbsideEnabled: boolean;
  pickupLeadTime: number;
  tippingEnabled: boolean;
  tipPresets: number[];
}

export interface BusinessHours {
  periods: {
    dayOfWeek: string;
    startLocalTime: string;
    endLocalTime: string;
  }[];
}

// ═══════════════════════════════════════
//   LOYALTY TYPES
// ═══════════════════════════════════════

export interface LoyaltyProgram {
  id: string;
  terminology: {
    one: string;
    other: string;
  };
  rewardTiers: LoyaltyRewardTier[];
  accrualRules: LoyaltyAccrualRule[];
}

export interface LoyaltyRewardTier {
  id: string;
  name: string;
  points: number;
  definition: {
    discountType: string;
    percentageDiscount?: string;
    fixedDiscountMoney?: { amount: number; currency: string };
    scope: string;
  };
}

export interface LoyaltyAccrualRule {
  accrualType: string;
  points: number;
  spendData?: {
    amountMoney: { amount: number; currency: string };
  };
}

export interface LoyaltyAccount {
  id: string;
  programId: string;
  balance: number;
  lifetimePoints: number;
  customerId: string;
  enrolledAt: string;
}

// ═══════════════════════════════════════
//   MERCHANT / ADMIN TYPES
// ═══════════════════════════════════════

export interface MerchantProfile {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  subscriptionPlan: string;
  squareConnected: boolean;
}

export type MerchantUserRole = "owner" | "manager" | "staff" | "viewer";
