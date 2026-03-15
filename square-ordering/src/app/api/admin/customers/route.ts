import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.userType !== "merchant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const merchantId =
    request.nextUrl.searchParams.get("merchantId") || session.user.merchantId;
  const search = request.nextUrl.searchParams.get("search") || "";
  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "20", 10)));

  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  // Build the where clause: users who have placed orders with this merchant
  const userWhere: Prisma.UserWhereInput = {
    orders: {
      some: {
        merchantId,
      },
    },
  };

  // Apply search filter on name or email
  if (search) {
    userWhere.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { givenName: { contains: search, mode: "insensitive" } },
      { familyName: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get total count
  const total = await db.user.count({ where: userWhere });
  const totalPages = Math.ceil(total / limit);

  // Fetch customers with aggregated order data
  const customers = await db.user.findMany({
    where: userWhere,
    select: {
      id: true,
      email: true,
      givenName: true,
      familyName: true,
      phone: true,
      createdAt: true,
      orders: {
        where: { merchantId },
        select: {
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Process and sort by most recent order
  const result = customers
    .map((customer) => {
      const nonCancelledOrders = customer.orders.filter(
        (o) => o.status !== "cancelled"
      );
      const totalSpent = nonCancelledOrders.reduce((sum, o) => sum + o.total, 0);
      const orderCount = customer.orders.length;
      const lastOrderAt =
        customer.orders.length > 0
          ? customer.orders[0].createdAt.toISOString()
          : null;

      return {
        id: customer.id,
        email: customer.email,
        givenName: customer.givenName,
        familyName: customer.familyName,
        phone: customer.phone,
        createdAt: customer.createdAt.toISOString(),
        orderCount,
        totalSpent,
        lastOrderAt,
      };
    })
    .sort((a, b) => {
      if (!a.lastOrderAt && !b.lastOrderAt) return 0;
      if (!a.lastOrderAt) return 1;
      if (!b.lastOrderAt) return -1;
      return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
    });

  return NextResponse.json({
    customers: result,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  });
}
