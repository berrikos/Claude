"use client";

import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export function CartFloatingButton() {
  const items = useCartStore((s) => s.items);
  const itemCount = useCartStore((s) => s.itemCount);
  const subtotal = useCartStore((s) => s.subtotal);
  const params = useParams();

  const count = itemCount();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 lg:hidden">
      <Link
        href={`/${params.restaurant}/checkout`}
        className="flex w-full items-center justify-between rounded-2xl bg-primary px-6 py-4 text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-primary">
              {count}
            </span>
          </div>
          <span className="font-medium">View Cart</span>
        </div>
        <span className="text-lg font-bold">{formatPrice(subtotal())}</span>
      </Link>
    </div>
  );
}
