import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { customerId } = await params;
  const merchantId = session.user.merchantId;

  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  // Verify this customer has placed orders with this merchant
  const customer = await db.user.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      email: true,
      givenName: true,
      familyName: true,
      phone: true,
      createdAt: true,
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  // Get recent orders for this merchant
  const orders = await db.order.findMany({
    where: {
      userId: customerId,
      merchantId,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      items: {
        select: {
          id: true,
          name: true,
          quantity: true,
          totalPrice: true,
          modifiers: true,
        },
      },
      location: { select: { name: true } },
    },
  });

  if (orders.length === 0) {
    return NextResponse.json(
      { error: "Customer has no orders with this merchant" },
      { status: 404 }
    );
  }

  // Calculate aggregates
  const nonCancelledOrders = orders.filter((o) => o.status !== "cancelled");
  const totalSpent = nonCancelledOrders.reduce((sum, o) => sum + o.total, 0);

  // Get total order count (not just last 20)
  const totalOrderCount = await db.order.count({
    where: {
      userId: customerId,
      merchantId,
    },
  });

  return NextResponse.json({
    customer: {
      id: customer.id,
      email: customer.email,
      givenName: customer.givenName,
      familyName: customer.familyName,
      phone: customer.phone,
      createdAt: customer.createdAt.toISOString(),
      orderCount: totalOrderCount,
      totalSpent,
    },
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      fulfillmentType: o.fulfillmentType,
      subtotal: o.subtotal,
      tax: o.tax,
      tip: o.tip,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      locationName: o.location.name,
      items: o.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        modifiers: (item.modifiers as Array<{ name: string }>) || [],
      })),
    })),
  });
}
