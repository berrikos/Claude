import { NextRequest, NextResponse } from "next/server";
import { getMenu, invalidateMenuCache } from "@/lib/square-catalog";

/**
 * GET /api/square/catalog?merchantId=xxx&locationId=xxx
 * Returns the menu for a merchant location.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const merchantId = searchParams.get("merchantId");
  const locationId = searchParams.get("locationId");

  if (!merchantId || !locationId) {
    return NextResponse.json(
      { error: "merchantId and locationId are required" },
      { status: 400 }
    );
  }

  try {
    const menu = await getMenu(merchantId, locationId);
    return NextResponse.json({ menu });
  } catch (error) {
    console.error("Error fetching catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/square/catalog/sync
 * Force-refreshes the menu cache for a merchant.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { merchantId } = body;

  if (!merchantId) {
    return NextResponse.json(
      { error: "merchantId is required" },
      { status: 400 }
    );
  }

  try {
    await invalidateMenuCache(merchantId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing catalog:", error);
    return NextResponse.json(
      { error: "Failed to sync menu" },
      { status: 500 }
    );
  }
}
