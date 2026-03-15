import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId = session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const locations = await db.location.findMany({
    where: { merchantId },
    select: {
      id: true,
      name: true,
      onlineOrderingHours: {
        select: {
          id: true,
          dayOfWeek: true,
          openTime: true,
          closeTime: true,
          useSquareHours: true,
        },
        orderBy: { dayOfWeek: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ locations });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId = session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const body = await request.json();
  const { locationId, hours } = body as {
    locationId: string;
    hours: Array<{ dayOfWeek: number; openTime: string; closeTime: string }>;
  };

  if (!locationId || !hours) {
    return NextResponse.json(
      { error: "locationId and hours are required" },
      { status: 400 }
    );
  }

  // Verify location belongs to this merchant
  const location = await db.location.findFirst({
    where: { id: locationId, merchantId },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Delete existing hours for this location
  await db.onlineOrderingHours.deleteMany({
    where: { locationId },
  });

  // Create new hours
  const created = await db.onlineOrderingHours.createMany({
    data: hours.map((h) => ({
      locationId,
      dayOfWeek: h.dayOfWeek,
      openTime: h.openTime,
      closeTime: h.closeTime,
      useSquareHours: false,
    })),
  });

  // Fetch and return updated hours
  const updatedHours = await db.onlineOrderingHours.findMany({
    where: { locationId },
    select: {
      id: true,
      dayOfWeek: true,
      openTime: true,
      closeTime: true,
      useSquareHours: true,
    },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({
    count: created.count,
    hours: updatedHours,
  });
}
