import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, SelectedModifier } from "@/types";

interface CartState {
  items: CartItem[];
  merchantId: string | null;
  locationId: string | null;

  // Actions
  addItem: (item: Omit<CartItem, "id">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setLocation: (merchantId: string, locationId: string) => void;

  // Computed
  itemCount: () => number;
  subtotal: () => number;
}

function generateCartItemId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function getItemTotal(item: CartItem): number {
  const modifierTotal = item.selectedModifiers.reduce(
    (sum, m) => sum + m.priceCents,
    0
  );
  return (item.basePriceCents + modifierTotal) * item.quantity;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      merchantId: null,
      locationId: null,

      addItem: (item) => {
        const state = get();

        // Check if adding from a different merchant — clear cart
        if (state.merchantId && state.merchantId !== item.menuItemId.split("_")[0]) {
          // Items from different merchants not supported in same cart
        }

        // Check for duplicate (same variation + same modifiers)
        const existingIndex = state.items.findIndex(
          (existing) =>
            existing.variationId === item.variationId &&
            existing.specialInstructions === item.specialInstructions &&
            modifiersMatch(existing.selectedModifiers, item.selectedModifiers)
        );

        if (existingIndex >= 0) {
          // Increment quantity of existing item
          const updatedItems = [...state.items];
          updatedItems[existingIndex] = {
            ...updatedItems[existingIndex],
            quantity: updatedItems[existingIndex].quantity + item.quantity,
          };
          set({ items: updatedItems });
        } else {
          set({
            items: [...state.items, { ...item, id: generateCartItemId() }],
          });
        }
      },

      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== cartItemId),
        }));
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.id === cartItemId ? { ...item, quantity } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [], merchantId: null, locationId: null });
      },

      setLocation: (merchantId, locationId) => {
        const state = get();
        // If changing location, clear cart
        if (state.locationId && state.locationId !== locationId) {
          set({ items: [], merchantId, locationId });
        } else {
          set({ merchantId, locationId });
        }
      },

      itemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      subtotal: () => {
        return get().items.reduce((sum, item) => sum + getItemTotal(item), 0);
      },
    }),
    {
      name: "cart-storage",
    }
  )
);

function modifiersMatch(
  a: SelectedModifier[],
  b: SelectedModifier[]
): boolean {
  if (a.length !== b.length) return false;
  const aIds = a.map((m) => m.modifierId).sort();
  const bIds = b.map((m) => m.modifierId).sort();
  return aIds.every((id, i) => id === bIds[i]);
}
