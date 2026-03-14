import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { calculateOrder } from "@/lib/square-orders";
import { db } from "@/lib/db";

/**
 * POST /api/stripe/payment-intent
 * Creates a Stripe PaymentIntent for an order.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchantId,
      locationId,
      items,
      tip = 0,
      customerEmail,
    } = body;

    if (!merchantId || !locationId || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get location's Square ID
    const location = await db.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Calculate order totals via Square
    const totals = await calculateOrder(
      merchantId,
      location.squareLocationId,
      items
    );

    const totalWithTip = totals.total + tip;

    // Create Stripe PaymentIntent
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: totalWithTip,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        merchantId,
        locationId,
        squareLocationId: location.squareLocationId,
        subtotal: totals.subtotal.toString(),
        tax: totals.tax.toString(),
        tip: tip.toString(),
      },
      receipt_email: customerEmail || undefined,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      totals: {
        subtotal: totals.subtotal,
        tax: totals.tax,
        tip,
        total: totalWithTip,
      },
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
