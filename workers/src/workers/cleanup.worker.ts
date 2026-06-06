import { prisma } from "../prisma.js";

export interface CleanupResult {
  deleted: number;
}

export async function cleanupExpiredTokens(): Promise<CleanupResult> {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [magicLinkDeleted, passwordResetDeleted, inviteDeleted] = await Promise.all([
    prisma.magicLinkToken.deleteMany({
      where: { OR: [{ used: true }, { expires: { lt: now } }], createdAt: { lt: cutoff } },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { OR: [{ used: true }, { expires: { lt: now } }], createdAt: { lt: cutoff } },
    }),
    prisma.inviteToken.deleteMany({
      where: { OR: [{ used: true }, { expires: { lt: now } }], createdAt: { lt: cutoff } },
    }),
  ]);

  return {
    deleted: magicLinkDeleted.count + passwordResetDeleted.count + inviteDeleted.count,
  };
}
