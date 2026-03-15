import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await db.userAddress.findMany({
    where: { userId: session.user.id },
    orderBy: { isDefault: "desc" },
  });

  return NextResponse.json({ addresses });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { label, address } = await request.json();

  const existing = await db.userAddress.count({ where: { userId: session.user.id } });

  const newAddress = await db.userAddress.create({
    data: {
      userId: session.user.id,
      label: label || "Home",
      address,
      isDefault: existing === 0,
    },
  });

  return NextResponse.json({ address: newAddress });
}
