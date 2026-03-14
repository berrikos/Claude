import { NextRequest, NextResponse } from "next/server";
import { getLoyaltyProgram, getLoyaltyAccount, enrollInLoyalty } from "@/lib/square-loyalty";

/**
 * GET /api/loyalty?merchantId=xxx&phone=xxx
 * Get loyalty program info and optionally the customer's account.
 */
export async function GET(request: NextRequest) {
  const merchantId = request.nextUrl.searchParams.get("merchantId");
  const phone = request.nextUrl.searchParams.get("phone");

  if (!merchantId) {
    return NextResponse.json({ error: "Missing merchantId" }, { status: 400 });
  }

  const program = await getLoyaltyProgram(merchantId);
  if (!program) {
    return NextResponse.json({ program: null, account: null });
  }

  let account = null;
  if (phone) {
    account = await getLoyaltyAccount(merchantId, phone);
  }

  return NextResponse.json({ program, account });
}

/**
 * POST /api/loyalty
 * Enroll a customer in the loyalty program.
 */
export async function POST(request: NextRequest) {
  const { merchantId, phone } = await request.json();

  if (!merchantId || !phone) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const program = await getLoyaltyProgram(merchantId);
  if (!program) {
    return NextResponse.json({ error: "No loyalty program found" }, { status: 404 });
  }

  // Check if already enrolled
  const existing = await getLoyaltyAccount(merchantId, phone);
  if (existing) {
    return NextResponse.json({ account: existing });
  }

  const account = await enrollInLoyalty(merchantId, program.id, phone);
  if (!account) {
    return NextResponse.json({ error: "Failed to enroll" }, { status: 500 });
  }

  return NextResponse.json({ account });
}
