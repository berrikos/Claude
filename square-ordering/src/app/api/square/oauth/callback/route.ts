import { NextRequest, NextResponse } from "next/server";
import { SquareClient, SquareEnvironment } from "square";
import { exchangeSquareCode } from "@/lib/square";
import { syncLocations } from "@/lib/square-locations";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { cookies } from "next/headers";

/**
 * GET /api/square/oauth/callback
 * Handles the OAuth callback from Square after merchant authorizes.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/onboarding?error=${error}`, request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/admin/onboarding?error=missing_params", request.url)
    );
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const storedState = cookieStore.get("square_oauth_state")?.value;
  if (state !== storedState) {
    return NextResponse.redirect(
      new URL("/admin/onboarding?error=invalid_state", request.url)
    );
  }
  cookieStore.delete("square_oauth_state");

  try {
    // Exchange code for tokens
    const tokenResult = await exchangeSquareCode(code);

    if (!tokenResult.accessToken || !tokenResult.refreshToken || !tokenResult.merchantId) {
      throw new Error("Incomplete token response from Square");
    }

    // Get merchant info using the new access token
    const merchantClient = new SquareClient({
      token: tokenResult.accessToken,
      environment:
        process.env.SQUARE_ENVIRONMENT === "production"
          ? SquareEnvironment.Production
          : SquareEnvironment.Sandbox,
    });

    const merchantResponse = await merchantClient.merchants.get({
      merchantId: tokenResult.merchantId as string,
    });
    const merchantName = merchantResponse.merchant?.businessName || "My Restaurant";

    // Create or update merchant
    const merchant = await db.merchant.upsert({
      where: { squareMerchantId: tokenResult.merchantId as string },
      create: {
        squareMerchantId: tokenResult.merchantId as string,
        name: merchantName,
        slug: slugify(merchantName),
        tokens: {
          create: {
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken,
            expiresAt: new Date(tokenResult.expiresAt!),
            scopes: [],
            lastRefreshed: new Date(),
          },
        },
        branding: { create: {} },
        loyaltySettings: { create: {} },
        notificationSettings: { create: {} },
      },
      update: {
        name: merchantName,
        tokens: {
          upsert: {
            create: {
              accessToken: tokenResult.accessToken,
              refreshToken: tokenResult.refreshToken,
              expiresAt: new Date(tokenResult.expiresAt!),
              scopes: [],
              lastRefreshed: new Date(),
            },
            update: {
              accessToken: tokenResult.accessToken,
              refreshToken: tokenResult.refreshToken,
              expiresAt: new Date(tokenResult.expiresAt!),
              scopes: [],
              lastRefreshed: new Date(),
            },
          },
        },
      },
    });

    // Sync locations from Square
    await syncLocations(merchant.id);

    // Redirect to onboarding with success
    return NextResponse.redirect(
      new URL(
        `/admin/onboarding?step=locations&merchant=${merchant.id}`,
        request.url
      )
    );
  } catch (err) {
    console.error("Square OAuth callback error:", err);
    return NextResponse.redirect(
      new URL("/admin/onboarding?error=oauth_failed", request.url)
    );
  }
}
