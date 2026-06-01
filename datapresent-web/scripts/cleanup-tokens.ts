/**
 * Token Cleanup Script
 *
 * Deletes expired / used tokens from the database to prevent bloat.
 * Safe to run on a schedule (cron) or manually.
 *
 * Cleanup rules:
 *  - MagicLinkToken: expires < NOW()
 *  - PasswordResetToken: expires < NOW()
 *  - InviteToken: expires < NOW()
 *  - RateLimit: expires < NOW()
 *
 * Run as script: npx tsx scripts/cleanup-tokens.ts
 * Import for tests: import { cleanupExpiredTokens } from '@/scripts/cleanup-tokens'
 */

import { prisma } from "@/lib/prisma";

export interface CleanupResult {
  magicLinkTokens: number;
  passwordResetTokens: number;
  inviteTokens: number;
  rateLimits: number;
  total: number;
}

/**
 * Delete all expired tokens and rate limit records.
 * @returns Object with counts per table and total.
 */
export async function cleanupExpiredTokens(): Promise<CleanupResult> {
  const now = new Date();

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [magicLinkTokens, passwordResetTokens, inviteTokens, rateLimits] = await Promise.all([
    prisma.magicLinkToken
      .deleteMany({
        where: {
          OR: [
            { used: true, createdAt: { lt: sevenDaysAgo } },
            { used: false, expires: { lt: now } },
          ],
        },
      })
      .then((r) => r.count),
    prisma.passwordResetToken.deleteMany({ where: { expires: { lt: now } } }).then((r) => r.count),
    prisma.inviteToken.deleteMany({ where: { expires: { lt: now } } }).then((r) => r.count),
    prisma.rateLimit.deleteMany({ where: { expires: { lt: now } } }).then((r) => r.count),
  ]);

  const total = magicLinkTokens + passwordResetTokens + inviteTokens + rateLimits;

  return { magicLinkTokens, passwordResetTokens, inviteTokens, rateLimits, total };
}

async function main() {
  const result = await cleanupExpiredTokens();
  console.log(`Cleanup complete: ${result.total} tokens deleted`);
  const entries = Object.entries(result).filter(([k, v]) => k !== "total" && v > 0);
  for (const [table, count] of entries) {
    console.log(`  ${table}: ${count}`);
  }
}

main()
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  })
  .finally(() => {
    if (typeof prisma.$disconnect === "function") {
      prisma.$disconnect();
    }
  });
