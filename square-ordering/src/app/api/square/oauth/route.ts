import { NextResponse } from "next/server";
import { getSquareOAuthUrl } from "@/lib/square";
import { generateState } from "@/lib/utils";
import { cookies } from "next/headers";

/**
 * GET /api/square/oauth
 * Initiates the Square OAuth flow. Redirects to Square's authorization page.
 */
export async function GET() {
  const state = generateState();

  // Store state in cookie for CSRF verification
  const cookieStore = await cookies();
  cookieStore.set("square_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes
    path: "/",
  });

  const authUrl = getSquareOAuthUrl(state);

  return NextResponse.redirect(authUrl);
}
