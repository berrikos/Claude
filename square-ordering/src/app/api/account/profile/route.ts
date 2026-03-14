import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "customer") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { givenName, familyName, phone } = await request.json();

  const user = await db.user.update({
    where: { id: session.user.id },
    data: {
      givenName: givenName || null,
      familyName: familyName || null,
      phone: phone || null,
    },
  });

  return NextResponse.json({ user: { id: user.id, email: user.email } });
}
