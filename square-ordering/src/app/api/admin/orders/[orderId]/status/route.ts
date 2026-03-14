import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const { status, cancelledReason } = await request.json();

  const validStatuses = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.merchantId !== session.user.merchantId) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await db.order.update({
    where: { id: orderId },
    data: {
      status,
      cancelledReason: status === "cancelled" ? (cancelledReason || "Cancelled by merchant") : order.cancelledReason,
    },
  });

  // TODO: Send notification to customer when status changes
  // TODO: Update Square order fulfillment status

  return NextResponse.json({ order: { id: updated.id, status: updated.status } });
}
