import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const location = await db.location.findUnique({ where: { id } });
  if (!location || location.merchantId !== session.user.merchantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.location.update({
    where: { id },
    data: {
      onlineOrdering: body.onlineOrdering ?? location.onlineOrdering,
      pickupEnabled: body.pickupEnabled ?? location.pickupEnabled,
      curbsideEnabled: body.curbsideEnabled ?? location.curbsideEnabled,
      pickupLeadTime: body.pickupLeadTime ?? location.pickupLeadTime,
      tippingEnabled: body.tippingEnabled ?? location.tippingEnabled,
    },
  });

  return NextResponse.json({ location: updated });
}
