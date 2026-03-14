"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const router = useRouter();
  const params = useParams();
  const restaurant = params.restaurant as string;

  const { items, removeItem, updateQuantity, clearCart } = useCartStore();
  const [tip, setTip] = useState(0);
  const tipPresets = [15, 20, 25];

  const subtotal = items.reduce((sum, item) => {
    const modifierTotal = item.selectedModifiers.reduce(
      (ms, m) => ms + m.priceCents,
      0
    );
    return sum + (item.basePriceCents + modifierTotal) * item.quantity;
  }, 0);

  const tipAmount = Math.round(subtotal * (tip / 100));

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="mb-6 text-gray-500">Add items from the menu to get started.</p>
        <Button onClick={() => router.push(`/${restaurant}`)}>
          Browse Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Your Order</h1>

      {/* Cart Items */}
      <div className="mb-6 space-y-4">
        {items.map((item) => {
          const modifierTotal = item.selectedModifiers.reduce(
            (ms, m) => ms + m.priceCents,
            0
          );
          const itemTotal = (item.basePriceCents + modifierTotal) * item.quantity;

          return (
            <div key={item.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.name}</h3>
                  {item.variationName && (
                    <p className="text-sm text-gray-500">{item.variationName}</p>
                  )}
                  {item.selectedModifiers.length > 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      {item.selectedModifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="mt-1 text-xs italic text-gray-400">
                      &quot;{item.specialInstructions}&quot;
                    </p>
                  )}
                </div>
                <p className="ml-4 font-medium">{formatPrice(itemTotal)}</p>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      item.quantity > 1
                        ? updateQuantity(item.id, item.quantity - 1)
                        : removeItem(item.id)
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-gray-600 hover:bg-gray-100"
                  >
                    {item.quantity === 1 ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    ) : (
                      "-"
                    )}
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tip Selection */}
      <div className="mb-6 rounded-lg border p-4">
        <h3 className="mb-3 font-medium text-gray-900">Add a Tip</h3>
        <div className="flex gap-2">
          {tipPresets.map((pct) => (
            <button
              key={pct}
              onClick={() => setTip(tip === pct ? 0 : pct)}
              className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                tip === pct
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {pct}%
            </button>
          ))}
          <button
            onClick={() => {
              const custom = prompt("Enter tip percentage:");
              if (custom) setTip(Number(custom) || 0);
            }}
            className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
              !tipPresets.includes(tip) && tip > 0
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            Custom
          </button>
        </div>
        {tip > 0 && (
          <p className="mt-2 text-right text-sm text-gray-500">
            Tip: {formatPrice(tipAmount)}
          </p>
        )}
      </div>

      {/* Order Summary */}
      <div className="mb-6 rounded-lg border p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tax</span>
            <span className="text-gray-400">Calculated at checkout</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tip ({tip}%)</span>
              <span>{formatPrice(tipAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>Estimated Total</span>
            <span>{formatPrice(subtotal + tipAmount)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => clearCart()}
          className="flex-shrink-0"
        >
          Clear Cart
        </Button>
        <Button
          onClick={() => router.push(`/${restaurant}/checkout?tip=${tipAmount}`)}
          className="flex-1"
          size="lg"
        >
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
}
