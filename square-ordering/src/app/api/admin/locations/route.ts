import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId = request.nextUrl.searchParams.get("merchantId") || session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const locations = await db.location.findMany({
    where: { merchantId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      squareLocationId: true,
      isActive: true,
      onlineOrdering: true,
      pickupEnabled: true,
      curbsideEnabled: true,
      address: true,
    },
  });

  return NextResponse.json({ locations });
}
