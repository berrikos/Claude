import { SquareClient, SquareEnvironment } from "square";
import { db } from "./db";

const squareEnv =
  process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox;

/**
 * Create a Square client for a specific merchant using their stored OAuth tokens.
 */
export async function getSquareClient(merchantId: string) {
  const tokens = await db.merchantToken.findUnique({
    where: { merchantId },
  });

  if (!tokens) {
    throw new Error(`No Square tokens found for merchant ${merchantId}`);
  }

  // Check if token needs refresh (refresh if within 7 days of expiry)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  if (tokens.expiresAt < sevenDaysFromNow) {
    const refreshedTokens = await refreshSquareToken(merchantId, tokens.refreshToken);
    return new SquareClient({
      token: refreshedTokens.accessToken,
      environment: squareEnv,
    });
  }

  return new SquareClient({
    token: tokens.accessToken,
    environment: squareEnv,
  });
}

/**
 * Create a Square client using the application-level access token.
 */
export function getSquareAppClient() {
  return new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: squareEnv,
  });
}

/**
 * Refresh a merchant's Square OAuth token.
 */
async function refreshSquareToken(merchantId: string, refreshToken: string) {
  const client = getSquareAppClient();

  const response = await client.oAuth.obtainToken({
    clientId: process.env.SQUARE_OAUTH_CLIENT_ID!,
    clientSecret: process.env.SQUARE_OAUTH_CLIENT_SECRET!,
    grantType: "refresh_token",
    refreshToken,
  });

  const updatedTokens = await db.merchantToken.update({
    where: { merchantId },
    data: {
      accessToken: response.accessToken!,
      refreshToken: response.refreshToken!,
      expiresAt: new Date(response.expiresAt!),
      lastRefreshed: new Date(),
    },
  });

  return updatedTokens;
}

/**
 * Generate the Square OAuth authorization URL.
 */
export function getSquareOAuthUrl(state: string) {
  const baseUrl =
    process.env.SQUARE_ENVIRONMENT === "production"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";

  const scopes = [
    "ITEMS_READ",
    "MERCHANT_PROFILE_READ",
    "ORDERS_READ",
    "ORDERS_WRITE",
    "CUSTOMERS_READ",
    "CUSTOMERS_WRITE",
    "LOYALTY_READ",
    "LOYALTY_WRITE",
  ].join("+");

  const params = new URLSearchParams({
    client_id: process.env.SQUARE_OAUTH_CLIENT_ID!,
    scope: scopes,
    session: "false",
    state,
  });

  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for access and refresh tokens.
 */
export async function exchangeSquareCode(code: string) {
  const client = getSquareAppClient();

  const response = await client.oAuth.obtainToken({
    clientId: process.env.SQUARE_OAUTH_CLIENT_ID!,
    clientSecret: process.env.SQUARE_OAUTH_CLIENT_SECRET!,
    grantType: "authorization_code",
    code,
  });

  return response;
}
