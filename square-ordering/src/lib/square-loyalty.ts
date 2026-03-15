import { getSquareClient } from "./square";
import type { LoyaltyProgram, LoyaltyAccount, LoyaltyRewardTier, LoyaltyAccrualRule } from "@/types";

/**
 * Get the loyalty program for a merchant.
 */
export async function getLoyaltyProgram(merchantId: string): Promise<LoyaltyProgram | null> {
  try {
    const client = await getSquareClient(merchantId);
    const response = await client.loyalty.programs.get({ programId: "main" });
    const program = response.program;

    if (!program) return null;

    return {
      id: program.id!,
      terminology: {
        one: program.terminology?.one || "Point",
        other: program.terminology?.other || "Points",
      },
      rewardTiers: (program.rewardTiers || []).map((tier): LoyaltyRewardTier => ({
        id: tier.id!,
        name: tier.name || "",
        points: Number(tier.points || 0),
        definition: {
          discountType: "PRICING_RULE",
          scope: "ORDER",
        },
      })),
      accrualRules: (program.accrualRules || []).map((rule): LoyaltyAccrualRule => {
        const ruleData = rule as unknown as Record<string, unknown>;
        const spendMoney = ruleData.spendAmountMoney as { amount?: bigint | number; currency?: string } | undefined;
        return {
          accrualType: (ruleData.accrualType as string) || "SPEND",
          points: Number(ruleData.points || 0),
          spendData: spendMoney
            ? {
                amountMoney: {
                  amount: Number(spendMoney.amount || 0),
                  currency: spendMoney.currency || "USD",
                },
              }
            : undefined,
        };
      }),
    };
  } catch {
    return null;
  }
}

/**
 * Get or create a loyalty account for a customer.
 */
export async function getLoyaltyAccount(
  merchantId: string,
  phoneNumber: string
): Promise<LoyaltyAccount | null> {
  try {
    const client = await getSquareClient(merchantId);

    // Search for existing account
    const searchResponse = await client.loyalty.accounts.search({
      query: {
        mappings: [
          {
            phoneNumber,
          },
        ],
      },
    });

    const accounts = searchResponse.loyaltyAccounts || [];
    if (accounts.length > 0) {
      const acct = accounts[0];
      return {
        id: acct.id!,
        programId: acct.programId!,
        balance: Number(acct.balance || 0),
        lifetimePoints: Number(acct.lifetimePoints || 0),
        customerId: acct.customerId || "",
        enrolledAt: acct.enrolledAt || new Date().toISOString(),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Enroll a customer in the loyalty program.
 */
export async function enrollInLoyalty(
  merchantId: string,
  programId: string,
  phoneNumber: string
): Promise<LoyaltyAccount | null> {
  try {
    const client = await getSquareClient(merchantId);

    const response = await client.loyalty.accounts.create({
      loyaltyAccount: {
        programId,
        mapping: { phoneNumber },
      },
      idempotencyKey: `enroll_${phoneNumber}_${Date.now()}`,
    });

    const acct = response.loyaltyAccount;
    if (!acct) return null;

    return {
      id: acct.id!,
      programId: acct.programId!,
      balance: Number(acct.balance || 0),
      lifetimePoints: Number(acct.lifetimePoints || 0),
      customerId: acct.customerId || "",
      enrolledAt: acct.enrolledAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Calculate loyalty points that would be earned for an order.
 */
export async function calculateLoyaltyPoints(
  merchantId: string,
  orderId: string,
  loyaltyAccountId: string,
  locationId: string
): Promise<number> {
  try {
    const client = await getSquareClient(merchantId);

    const response = await client.loyalty.accounts.accumulatePoints({
      accountId: loyaltyAccountId,
      accumulatePoints: { orderId },
      idempotencyKey: `points_${orderId}_${Date.now()}`,
      locationId,
    });

    return Number(response.event?.accumulatePoints?.points || 0);
  } catch {
    return 0;
  }
}

/**
 * Redeem a loyalty reward.
 */
export async function redeemReward(
  merchantId: string,
  loyaltyAccountId: string,
  rewardTierId: string
): Promise<{ rewardId: string } | null> {
  try {
    const client = await getSquareClient(merchantId);

    const response = await client.loyalty.rewards.create({
      reward: {
        loyaltyAccountId,
        rewardTierId,
      },
      idempotencyKey: `reward_${loyaltyAccountId}_${Date.now()}`,
    });

    if (!response.reward?.id) return null;

    return { rewardId: response.reward.id };
  } catch {
    return null;
  }
}
