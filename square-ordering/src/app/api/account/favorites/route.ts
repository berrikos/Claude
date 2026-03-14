import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { merchantId, squareCatalogId, itemName } = await request.json();

  if (!merchantId || !squareCatalogId || !itemName) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Toggle favorite
  const existing = await db.favoriteItem.findFirst({
    where: {
      userId: session.user.id,
      merchantId,
      squareCatalogId,
    },
  });

  if (existing) {
    await db.favoriteItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await db.favoriteItem.create({
    data: {
      userId: session.user.id,
      merchantId,
      squareCatalogId,
      itemName,
    },
  });

  return NextResponse.json({ favorited: true });
}
