import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId = session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const members = await db.merchantUser.findMany({
    where: { merchantId },
    select: {
      id: true,
      email: true,
      givenName: true,
      familyName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
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
  const { email, role, password, givenName, familyName } = body;

  if (!email || !role || !password) {
    return NextResponse.json(
      { error: "Email, role, and password are required" },
      { status: 400 }
    );
  }

  const existing = await db.merchantUser.findUnique({
    where: { email },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const member = await db.merchantUser.create({
    data: {
      merchantId,
      email,
      role,
      passwordHash,
      givenName: givenName || null,
      familyName: familyName || null,
    },
    select: {
      id: true,
      email: true,
      givenName: true,
      familyName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
