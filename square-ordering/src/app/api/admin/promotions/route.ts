import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId =
    request.nextUrl.searchParams.get("merchantId") ||
    session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const promotions = await db.promotion.findMany({
    where: { merchantId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ promotions });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId = session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const body = await request.json();

  const {
    name,
    type,
    value,
    freeItemId,
    minOrderAmount,
    promoCode,
    targetAudience,
    maxUses,
    startsAt,
    endsAt,
    locationId,
    displayOnStorefront,
    displayOnCheckout,
  } = body;

  if (!name || !type || value === undefined || !startsAt) {
    return NextResponse.json(
      { error: "Missing required fields: name, type, value, startsAt" },
      { status: 400 }
    );
  }

  if (!["percentage", "fixed_amount", "free_item"].includes(type)) {
    return NextResponse.json(
      { error: "Invalid type. Must be percentage, fixed_amount, or free_item" },
      { status: 400 }
    );
  }

  const promotion = await db.promotion.create({
    data: {
      merchantId,
      name,
      type,
      value: Number(value),
      freeItemId: freeItemId || null,
      minOrderAmount: minOrderAmount != null ? Number(minOrderAmount) : null,
      promoCode: promoCode || null,
      targetAudience: targetAudience || "all",
      maxUses: maxUses != null ? Number(maxUses) : null,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      locationId: locationId || null,
      displayOnStorefront: displayOnStorefront ?? true,
      displayOnCheckout: displayOnCheckout ?? true,
    },
  });

  return NextResponse.json({ promotion }, { status: 201 });
}
