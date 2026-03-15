"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" /></div>}>
      <OrderConfirmationContent />
    </Suspense>
  );
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const paymentIntent = searchParams.get("payment_intent");
  const status = searchParams.get("redirect_status");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      {status === "succeeded" ? (
        <>
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Order Confirmed!
          </h1>
          <p className="mb-2 text-gray-500">
            Your order has been placed successfully.
          </p>
          <p className="mb-8 text-sm text-gray-400">
            You&apos;ll receive a confirmation email shortly.
          </p>
          {paymentIntent && (
            <p className="mb-6 text-xs text-gray-400">
              Reference: {paymentIntent}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-10 w-10 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">
            Payment Issue
          </h1>
          <p className="mb-8 text-gray-500">
            There was an issue processing your payment. Please try again.
          </p>
        </>
      )}

      <Link href="/">
        <Button variant={status === "succeeded" ? "outline" : "default"}>
          Back to Menu
        </Button>
      </Link>
    </div>
  );
}
