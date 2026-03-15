import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { promoCode, merchantId, orderSubtotal } = body;

  if (!promoCode || !merchantId) {
    return NextResponse.json(
      { error: "Missing required fields: promoCode, merchantId" },
      { status: 400 }
    );
  }

  const promotion = await db.promotion.findFirst({
    where: {
      merchantId,
      promoCode: {
        equals: promoCode,
        mode: "insensitive",
      },
    },
  });

  if (!promotion) {
    return NextResponse.json(
      { valid: false, error: "Invalid promo code" },
      { status: 404 }
    );
  }

  if (!promotion.isActive) {
    return NextResponse.json(
      { valid: false, error: "This promotion is no longer active" },
      { status: 400 }
    );
  }

  const now = new Date();
  if (now < promotion.startsAt) {
    return NextResponse.json(
      { valid: false, error: "This promotion has not started yet" },
      { status: 400 }
    );
  }

  if (promotion.endsAt && now > promotion.endsAt) {
    return NextResponse.json(
      { valid: false, error: "This promotion has expired" },
      { status: 400 }
    );
  }

  if (promotion.maxUses !== null && promotion.timesUsed >= promotion.maxUses) {
    return NextResponse.json(
      { valid: false, error: "This promotion has reached its usage limit" },
      { status: 400 }
    );
  }

  if (
    promotion.minOrderAmount !== null &&
    orderSubtotal !== undefined &&
    orderSubtotal < promotion.minOrderAmount
  ) {
    const minAmount = (promotion.minOrderAmount / 100).toFixed(2);
    return NextResponse.json(
      {
        valid: false,
        error: `Minimum order amount of $${minAmount} required`,
      },
      { status: 400 }
    );
  }

  let discountAmount = 0;
  if (promotion.type === "percentage" && orderSubtotal !== undefined) {
    discountAmount = Math.round((orderSubtotal * promotion.value) / 100);
  } else if (promotion.type === "fixed_amount") {
    discountAmount = promotion.value;
  }

  return NextResponse.json({
    valid: true,
    promotion: {
      id: promotion.id,
      name: promotion.name,
      type: promotion.type,
      value: promotion.value,
      freeItemId: promotion.freeItemId,
      discountAmount,
    },
  });
}
