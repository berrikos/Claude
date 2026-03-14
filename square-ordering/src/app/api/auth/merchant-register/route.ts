import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

/**
 * POST /api/auth/merchant-register
 * Register a new merchant admin account. Called during onboarding.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, givenName, familyName, merchantId } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await db.merchantUser.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // If merchantId is provided, verify it exists
    if (merchantId) {
      const merchant = await db.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) {
        return NextResponse.json(
          { error: "Merchant not found" },
          { status: 404 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await db.merchantUser.create({
      data: {
        email,
        passwordHash,
        givenName: givenName || null,
        familyName: familyName || null,
        merchantId: merchantId || "",
        role: "owner",
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error("Merchant registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
