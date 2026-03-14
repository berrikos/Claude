import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId = request.nextUrl.searchParams.get("merchantId") || session.user.merchantId;
  const statusParam = request.nextUrl.searchParams.get("status") || "pending,confirmed,preparing,ready";
  const statuses = statusParam.split(",");

  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const orders = await db.order.findMany({
    where: {
      merchantId,
      status: { in: statuses },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: true,
      location: { select: { name: true } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      fulfillmentType: o.fulfillmentType,
      guestName: o.guestName,
      guestPhone: o.guestPhone,
      vehicleInfo: o.vehicleInfo,
      subtotal: o.subtotal,
      tax: o.tax,
      tip: o.tip,
      total: o.total,
      createdAt: o.createdAt.toISOString(),
      pickupAt: o.pickupAt?.toISOString() || null,
      locationName: o.location.name,
      items: o.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        modifiers: (item.modifiers as Array<{ name: string }>) || [],
        specialInstructions: item.specialInstructions,
      })),
    })),
  });
}
