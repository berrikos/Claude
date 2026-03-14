"use client";

import { Suspense, useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const restaurant = params.restaurant as string;
  const tipAmount = Number(searchParams.get("tip") || 0);

  const { items, merchantId, locationId } = useCartStore();
  const [clientSecret, setClientSecret] = useState("");
  const [totals, setTotals] = useState<{
    subtotal: number;
    tax: number;
    tip: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Customer info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fulfillment, setFulfillment] = useState<"pickup" | "curbside">("pickup");
  const [vehicleInfo, setVehicleInfo] = useState("");

  useEffect(() => {
    if (items.length === 0) {
      router.push(`/${restaurant}`);
      return;
    }

    createPaymentIntent();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const createPaymentIntent = async () => {
    try {
      const res = await fetch("/api/stripe/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          locationId,
          items,
          tip: tipAmount,
          customerEmail: email || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to create payment");

      const data = await res.json();
      setClientSecret(data.clientSecret);
      setTotals(data.totals);
    } catch {
      setError("Failed to initialize checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="mb-4 text-red-600">{error}</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Form */}
        <div className="lg:col-span-3">
          {/* Customer Info */}
          <div className="mb-6 rounded-lg border p-4">
            <h2 className="mb-4 font-medium text-gray-900">Your Information</h2>
            <div className="space-y-3">
              <Input
                label="Name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Fulfillment */}
          <div className="mb-6 rounded-lg border p-4">
            <h2 className="mb-4 font-medium text-gray-900">Pickup Method</h2>
            <div className="flex gap-3">
              <button
                onClick={() => setFulfillment("pickup")}
                className={`flex-1 rounded-lg border py-3 text-sm font-medium transition-colors ${
                  fulfillment === "pickup"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                Pickup
              </button>
              <button
                onClick={() => setFulfillment("curbside")}
                className={`flex-1 rounded-lg border py-3 text-sm font-medium transition-colors ${
                  fulfillment === "curbside"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                Curbside
              </button>
            </div>
            {fulfillment === "curbside" && (
              <div className="mt-3">
                <Input
                  label="Vehicle Description"
                  placeholder="e.g., Red Toyota Camry"
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Payment */}
          {clientSecret && (
            <div className="rounded-lg border p-4">
              <h2 className="mb-4 font-medium text-gray-900">Payment</h2>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: { colorPrimary: "#000000" },
                  },
                }}
              >
                <PaymentForm
                  restaurant={restaurant}
                  name={name}
                  email={email}
                  phone={phone}
                  fulfillment={fulfillment}
                  vehicleInfo={vehicleInfo}
                  tipAmount={tipAmount}
                />
              </Elements>
            </div>
          )}
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-20 rounded-lg border p-4">
            <h2 className="mb-3 font-medium text-gray-900">Order Summary</h2>
            <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.quantity}x {item.name}
                  </span>
                  <span>
                    {formatPrice(
                      (item.basePriceCents +
                        item.selectedModifiers.reduce(
                          (s, m) => s + m.priceCents,
                          0
                        )) *
                        item.quantity
                    )}
                  </span>
                </div>
              ))}
            </div>

            {totals && (
              <div className="space-y-2 border-t pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span>{formatPrice(totals.tax)}</span>
                </div>
                {totals.tip > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tip</span>
                    <span>{formatPrice(totals.tip)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{formatPrice(totals.total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentForm({
  restaurant,
  name,
  email,
  phone,
  fulfillment,
  vehicleInfo,
  tipAmount,
}: {
  restaurant: string;
  name: string;
  email: string;
  phone: string;
  fulfillment: "pickup" | "curbside";
  vehicleInfo: string;
  tipAmount: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { items, merchantId, locationId, clearCart } = useCartStore();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!name || !email || !phone) {
      setError("Please fill in all required fields.");
      return;
    }

    setProcessing(true);
    setError("");

    // Create order in our DB first
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantId,
          locationId,
          items,
          fulfillmentType: fulfillment,
          guestName: name,
          guestEmail: email,
          guestPhone: phone,
          vehicleInfo: fulfillment === "curbside" ? vehicleInfo : null,
          tip: tipAmount,
        }),
      });

      if (!orderRes.ok) throw new Error("Failed to create order");
    } catch {
      setError("Failed to create order. Please try again.");
      setProcessing(false);
      return;
    }

    // Confirm payment
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${restaurant}/order-confirmation`,
        receipt_email: email,
      },
    });

    if (stripeError) {
      setError(stripeError.message || "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      clearCart();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
      <Button
        type="submit"
        disabled={!stripe || processing}
        className="mt-4 w-full"
        size="lg"
      >
        {processing ? "Processing..." : "Place Order"}
      </Button>
      <p className="mt-2 text-center text-xs text-gray-400">
        Your payment is processed securely via Stripe.
      </p>
    </form>
  );
}
