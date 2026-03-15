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

  const notificationSettings = await db.merchantNotificationSettings.upsert({
    where: { merchantId },
    create: { merchantId },
    update: {},
  });

  return NextResponse.json({ notificationSettings });
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
  const {
    newOrderEmail,
    newOrderSound,
    dailySummaryEmail,
    weeklyReportEmail,
    lowStockAlerts,
    alertRecipients,
  } = body;

  const notificationSettings = await db.merchantNotificationSettings.upsert({
    where: { merchantId },
    create: {
      merchantId,
      newOrderEmail: newOrderEmail ?? true,
      newOrderSound: newOrderSound ?? true,
      dailySummaryEmail: dailySummaryEmail ?? false,
      weeklyReportEmail: weeklyReportEmail ?? false,
      lowStockAlerts: lowStockAlerts ?? true,
      alertRecipients: alertRecipients ?? [],
    },
    update: {
      ...(newOrderEmail !== undefined && { newOrderEmail }),
      ...(newOrderSound !== undefined && { newOrderSound }),
      ...(dailySummaryEmail !== undefined && { dailySummaryEmail }),
      ...(weeklyReportEmail !== undefined && { weeklyReportEmail }),
      ...(lowStockAlerts !== undefined && { lowStockAlerts }),
      ...(alertRecipients !== undefined && { alertRecipients }),
    },
  });

  return NextResponse.json({ notificationSettings });
}
