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

  const promotion = await db.promotion.findUnique({ where: { id } });
  if (!promotion || promotion.merchantId !== session.user.merchantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.promotion.update({
    where: { id },
    data: {
      name: body.name ?? promotion.name,
      type: body.type ?? promotion.type,
      value: body.value !== undefined ? Number(body.value) : promotion.value,
      freeItemId: body.freeItemId !== undefined ? body.freeItemId : promotion.freeItemId,
      minOrderAmount:
        body.minOrderAmount !== undefined
          ? body.minOrderAmount != null
            ? Number(body.minOrderAmount)
            : null
          : promotion.minOrderAmount,
      promoCode: body.promoCode !== undefined ? body.promoCode : promotion.promoCode,
      targetAudience: body.targetAudience ?? promotion.targetAudience,
      maxUses:
        body.maxUses !== undefined
          ? body.maxUses != null
            ? Number(body.maxUses)
            : null
          : promotion.maxUses,
      startsAt: body.startsAt ? new Date(body.startsAt) : promotion.startsAt,
      endsAt: body.endsAt !== undefined ? (body.endsAt ? new Date(body.endsAt) : null) : promotion.endsAt,
      isActive: body.isActive !== undefined ? body.isActive : promotion.isActive,
      locationId: body.locationId !== undefined ? body.locationId : promotion.locationId,
      displayOnStorefront:
        body.displayOnStorefront !== undefined
          ? body.displayOnStorefront
          : promotion.displayOnStorefront,
      displayOnCheckout:
        body.displayOnCheckout !== undefined
          ? body.displayOnCheckout
          : promotion.displayOnCheckout,
    },
  });

  return NextResponse.json({ promotion: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const promotion = await db.promotion.findUnique({ where: { id } });
  if (!promotion || promotion.merchantId !== session.user.merchantId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.promotion.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
