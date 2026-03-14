import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateMenuCache } from "@/lib/square-catalog";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const merchantId = body.merchantId || session.user.merchantId;
  const { itemId } = body;

  if (!merchantId || !itemId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Find existing global override (locationId = null)
  const existing = await db.menuItemOverride.findFirst({
    where: { merchantId, squareItemId: itemId, locationId: null },
  });

  let override;
  if (existing) {
    override = await db.menuItemOverride.update({
      where: { id: existing.id },
      data: {
        displayName: body.displayName ?? existing.displayName,
        displayDescription: body.displayDescription ?? existing.displayDescription,
        displayImageUrl: body.displayImageUrl ?? existing.displayImageUrl,
        isVisible: body.isVisible ?? existing.isVisible,
        isUnavailable: body.isUnavailable ?? existing.isUnavailable,
        isFeatured: body.isFeatured ?? existing.isFeatured,
        spicyLevel: body.spicyLevel ?? existing.spicyLevel,
        dietaryTags: body.dietaryTags ?? existing.dietaryTags,
        sortOrder: body.sortOrder ?? existing.sortOrder,
      },
    });
  } else {
    override = await db.menuItemOverride.create({
      data: {
        merchantId,
        squareItemId: itemId,
        locationId: null,
        displayName: body.displayName || null,
        displayDescription: body.displayDescription || null,
        displayImageUrl: body.displayImageUrl || null,
        isVisible: body.isVisible ?? true,
        isUnavailable: body.isUnavailable ?? false,
        isFeatured: body.isFeatured ?? false,
        spicyLevel: body.spicyLevel ?? 0,
        dietaryTags: body.dietaryTags || [],
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  await invalidateMenuCache(merchantId);

  return NextResponse.json({ override });
}
