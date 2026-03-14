import { getSquareClient } from "./square";
import type { CartItem } from "@/types";

interface CreateOrderParams {
  merchantId: string;
  locationId: string;
  squareLocationId: string;
  items: CartItem[];
  fulfillmentType: "pickup" | "curbside";
  pickupAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicleInfo?: string;
  tip: number;
  squareCustomerId?: string;
  stripePaymentIntentId: string;
}

/**
 * Create an order in Square after Stripe payment succeeds.
 */
export async function createSquareOrder(params: CreateOrderParams) {
  const client = await getSquareClient(params.merchantId);

  const lineItems = params.items.map((item) => ({
    catalogObjectId: item.variationId,
    quantity: item.quantity.toString(),
    modifiers: item.selectedModifiers.map((m) => ({
      catalogObjectId: m.modifierId,
    })),
    note: item.specialInstructions || undefined,
  }));

  // Create the order with fulfillment
  const orderResponse = await client.orders.create({
    order: {
      locationId: params.squareLocationId,
      lineItems,
      fulfillments: [
        {
          type: "PICKUP",
          state: "PROPOSED",
          pickupDetails: {
            recipient: {
              displayName: params.customerName,
              emailAddress: params.customerEmail,
              phoneNumber: params.customerPhone,
            },
            pickupAt: params.pickupAt,
            note: params.vehicleInfo ? `Curbside: ${params.vehicleInfo}` : undefined,
            scheduleType: "SCHEDULED",
          },
        },
      ],
      customerId: params.squareCustomerId || undefined,
    },
    idempotencyKey: `order_${params.stripePaymentIntentId}`,
  });

  const squareOrder = orderResponse.order;
  if (!squareOrder?.id) {
    throw new Error("Failed to create Square order");
  }

  // Record external payment so order appears on POS
  const totalMoney = squareOrder.totalMoney;
  await client.payments.create({
    sourceId: "EXTERNAL",
    idempotencyKey: `payment_${params.stripePaymentIntentId}`,
    amountMoney: {
      amount: totalMoney?.amount || BigInt(0),
      currency: totalMoney?.currency || "USD",
    },
    tipMoney: params.tip > 0
      ? { amount: BigInt(params.tip), currency: "USD" }
      : undefined,
    orderId: squareOrder.id,
    locationId: params.squareLocationId,
    externalDetails: {
      type: "OTHER",
      source: "Stripe Online Payment",
    },
    customerId: params.squareCustomerId || undefined,
  });

  return squareOrder;
}

/**
 * Calculate order totals (taxes, discounts) using Square's CalculateOrder.
 */
export async function calculateOrder(
  merchantId: string,
  squareLocationId: string,
  items: CartItem[]
) {
  const client = await getSquareClient(merchantId);

  const lineItems = items.map((item) => ({
    catalogObjectId: item.variationId,
    quantity: item.quantity.toString(),
    modifiers: item.selectedModifiers.map((m) => ({
      catalogObjectId: m.modifierId,
    })),
  }));

  const response = await client.orders.calculate({
    order: {
      locationId: squareLocationId,
      lineItems,
    },
  });

  const order = response.order;

  return {
    subtotal: Number(order?.totalMoney?.amount || 0),
    tax: Number(order?.totalTaxMoney?.amount || 0),
    discount: Number(order?.totalDiscountMoney?.amount || 0),
    total: Number(order?.netAmountDueMoney?.amount || 0),
  };
}
