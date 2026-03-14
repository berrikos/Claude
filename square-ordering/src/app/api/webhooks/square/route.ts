import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@/lib/db";
import { invalidateMenuCache } from "@/lib/square-catalog";

/**
 * POST /api/webhooks/square
 * Handles Square webhook events for order status updates and catalog changes.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");
  const notificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/square`;

  // Verify webhook signature
  if (process.env.SQUARE_WEBHOOK_SIGNATURE_KEY && signature) {
    const expectedSignature = createHmac(
      "sha256",
      process.env.SQUARE_WEBHOOK_SIGNATURE_KEY
    )
      .update(notificationUrl + body)
      .digest("base64");

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  const event = JSON.parse(body);

  switch (event.type) {
    case "order.fulfillment.updated": {
      await handleFulfillmentUpdate(event.data);
      break;
    }
    case "order.updated": {
      await handleOrderUpdate(event.data);
      break;
    }
    case "catalog.version.updated": {
      await handleCatalogUpdate(event.merchant_id);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleFulfillmentUpdate(data: {
  object?: { order_fulfillment_updated?: { order_id: string; fulfillment_update: Array<{ new_state: string }> } };
}) {
  const update = data.object?.order_fulfillment_updated;
  if (!update) return;

  const squareOrderId = update.order_id;
  const newState = update.fulfillment_update?.[0]?.new_state;

  if (!squareOrderId || !newState) return;

  // Map Square fulfillment states to our order statuses
  const statusMap: Record<string, string> = {
    PROPOSED: "confirmed",
    RESERVED: "confirmed",
    PREPARED: "preparing",
    COMPLETED: "ready",
    CANCELED: "cancelled",
    FAILED: "cancelled",
  };

  const newStatus = statusMap[newState];
  if (!newStatus) return;

  await db.order.updateMany({
    where: { squareOrderId },
    data: { status: newStatus },
  });
}

async function handleOrderUpdate(data: {
  object?: { order_updated?: { order_id: string; state: string } };
}) {
  const update = data.object?.order_updated;
  if (!update) return;

  if (update.state === "COMPLETED") {
    await db.order.updateMany({
      where: { squareOrderId: update.order_id },
      data: { status: "completed" },
    });
  }
}

async function handleCatalogUpdate(squareMerchantId: string) {
  if (!squareMerchantId) return;

  const merchant = await db.merchant.findUnique({
    where: { squareMerchantId },
  });

  if (merchant) {
    await invalidateMenuCache(merchant.id);
  }
}
