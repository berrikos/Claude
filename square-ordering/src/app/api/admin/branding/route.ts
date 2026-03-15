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

  const branding = await db.merchantBranding.findUnique({
    where: { merchantId },
  });

  return NextResponse.json({ branding });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const merchantId = body.merchantId || session.user.merchantId;

  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const branding = await db.merchantBranding.upsert({
    where: { merchantId },
    create: {
      merchantId,
      primaryColor: body.primaryColor || "#E23744",
      accentColor: body.accentColor || "#FF8A00",
      textColor: body.textColor || "#1F2937",
      logoUrl: body.logoUrl || null,
      heroImageUrl: body.heroImageUrl || null,
      heroText: body.heroText || null,
      menuLayout: body.menuLayout || "grid",
      fontPair: body.fontPair || "inter-system",
      announcementText: body.announcementText || null,
      announcementActive: body.announcementActive ?? false,
    },
    update: {
      primaryColor: body.primaryColor,
      accentColor: body.accentColor,
      textColor: body.textColor,
      logoUrl: body.logoUrl || null,
      heroImageUrl: body.heroImageUrl || null,
      heroText: body.heroText || null,
      menuLayout: body.menuLayout,
      fontPair: body.fontPair,
      announcementText: body.announcementText || null,
      announcementActive: body.announcementActive,
    },
  });

  return NextResponse.json({ branding });
}
