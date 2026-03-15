import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId = session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const { memberId } = await params;

  const member = await db.merchantUser.findFirst({
    where: { id: memberId, merchantId },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const body = await request.json();
  const { role, isActive } = body;

  const updated = await db.merchantUser.update({
    where: { id: memberId },
    data: {
      ...(role !== undefined && { role }),
      ...(isActive !== undefined && { isActive }),
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

  return NextResponse.json({ member: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId = session.user.merchantId;
  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const { memberId } = await params;

  // Can't delete yourself
  if (memberId === session.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const member = await db.merchantUser.findFirst({
    where: { id: memberId, merchantId },
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Can't delete the last owner
  if (member.role === "owner") {
    const ownerCount = await db.merchantUser.count({
      where: { merchantId, role: "owner" },
    });

    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last owner" },
        { status: 400 }
      );
    }
  }

  await db.merchantUser.delete({
    where: { id: memberId },
  });

  return NextResponse.json({ success: true });
}
