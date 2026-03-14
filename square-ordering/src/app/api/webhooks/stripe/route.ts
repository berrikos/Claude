import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createSquareOrder } from "@/lib/square-orders";
import { db } from "@/lib/db";
import Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events. Primary handler for payment_intent.succeeded
 * which triggers Square order creation.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSuccess(paymentIntent);
      break;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentFailure(paymentIntent);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { merchantId, locationId, squareLocationId } = paymentIntent.metadata;

  if (!merchantId || !locationId || !squareLocationId) {
    console.error("Missing metadata on payment intent:", paymentIntent.id);
    return;
  }

  // Find the pending order in our DB
  const order = await db.order.findFirst({
    where: {
      stripePaymentIntentId: paymentIntent.id,
      status: "pending",
    },
    include: { items: true },
  });

  if (!order) {
    console.error("No pending order found for payment intent:", paymentIntent.id);
    return;
  }

  try {
    // Create the order in Square (with fulfillment + external payment)
    const squareOrder = await createSquareOrder({
      merchantId: order.merchantId,
      locationId: order.locationId,
      squareLocationId,
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.squareCatalogId,
        variationId: item.squareCatalogId,
        name: item.name,
        variationName: "",
        quantity: item.quantity,
        basePriceCents: item.basePrice,
        selectedModifiers: (item.modifiers as Array<{
          modifierListId: string;
          modifierListName: string;
          modifierId: string;
          name: string;
          priceCents: number;
        }>) || [],
        specialInstructions: item.specialInstructions || "",
        imageUrl: null,
      })),
      fulfillmentType: order.fulfillmentType as "pickup" | "curbside",
      pickupAt: order.pickupAt?.toISOString() || new Date().toISOString(),
      customerName: order.guestName || "Customer",
      customerEmail: order.guestEmail || "",
      customerPhone: order.guestPhone || "",
      vehicleInfo: order.vehicleInfo || undefined,
      tip: order.tip,
      stripePaymentIntentId: paymentIntent.id,
    });

    // Update our order with Square order ID and confirmed status
    await db.order.update({
      where: { id: order.id },
      data: {
        squareOrderId: squareOrder.id,
        status: "confirmed",
      },
    });
  } catch (error) {
    console.error("Failed to create Square order after payment:", error);
    // Order is paid but Square creation failed — needs manual reconciliation
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "confirmed",
        specialInstructions: `${order.specialInstructions || ""}\n[ALERT: Square order creation failed. Needs manual processing.]`,
      },
    });
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  // Mark order as failed
  await db.order.updateMany({
    where: {
      stripePaymentIntentId: paymentIntent.id,
      status: "pending",
    },
    data: {
      status: "cancelled",
      cancelledReason: "Payment failed",
    },
  });
}
