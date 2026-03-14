import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/orders
 * Create a pending order in the database before payment.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchantId,
      locationId,
      items,
      fulfillmentType,
      guestName,
      guestEmail,
      guestPhone,
      vehicleInfo,
      tip = 0,
      stripePaymentIntentId,
    } = body;

    if (!merchantId || !locationId || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Calculate subtotal from items
    const subtotal = items.reduce(
      (sum: number, item: { basePriceCents: number; quantity: number; selectedModifiers: Array<{ priceCents: number }> }) => {
        const modTotal = item.selectedModifiers?.reduce(
          (ms: number, m: { priceCents: number }) => ms + m.priceCents,
          0
        ) || 0;
        return sum + (item.basePriceCents + modTotal) * item.quantity;
      },
      0
    );

    const order = await db.order.create({
      data: {
        merchantId,
        locationId,
        orderNumber,
        status: "pending",
        fulfillmentType: fulfillmentType || "pickup",
        subtotal,
        tax: 0, // Calculated by Square via webhook
        tip,
        total: subtotal + tip,
        guestName,
        guestEmail,
        guestPhone,
        vehicleInfo: vehicleInfo || null,
        stripePaymentIntentId: stripePaymentIntentId || null,
        items: {
          create: items.map(
            (item: {
              menuItemId: string;
              variationId: string;
              name: string;
              quantity: number;
              basePriceCents: number;
              selectedModifiers: Array<{
                modifierListId: string;
                modifierListName: string;
                modifierId: string;
                name: string;
                priceCents: number;
              }>;
              specialInstructions?: string;
            }) => ({
              squareCatalogId: item.variationId,
              name: item.name,
              quantity: item.quantity,
              basePrice: item.basePriceCents,
              totalPrice:
                (item.basePriceCents +
                  (item.selectedModifiers?.reduce(
                    (s: number, m: { priceCents: number }) => s + m.priceCents,
                    0
                  ) || 0)) *
                item.quantity,
              modifiers: item.selectedModifiers || [],
              specialInstructions: item.specialInstructions || null,
            })
          ),
        },
      },
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
