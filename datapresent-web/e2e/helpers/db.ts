import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// PromptBearer-style E2E database helpers
//
// Provides utilities to seed and clean up test data between E2E test runs.
// Each helper creates minimal, valid entities with sensible defaults.
// ---------------------------------------------------------------------------

let prisma: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/**
 * Dispose the Prisma client.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Truncate all application tables (except _prisma_migrations).
 * Call in `beforeEach` or `afterEach` when full isolation is required.
 */
export async function resetTestData(): Promise<void> {
  const db = getPrisma();

  const tableNames = await db.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
  `;

  for (const { tablename } of tableNames) {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
  }
}

/**
 * Create a test Report linked to an organization.
 * Returns the report ID.
 */
export async function createTestReport(
  db: PrismaClient,
  orgId: string,
  overrides?: {
    title?: string;
    sector?: "FINANCE" | "MARKETING" | "HR" | "SAAS" | "GENERIC";
    status?: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
    slideCount?: number;
  },
) {
  const reportId = crypto.randomUUID();

  await db.report.create({
    data: {
      id: reportId,
      title: overrides?.title ?? "E2E Test Report",
      sector: overrides?.sector ?? "GENERIC",
      status: overrides?.status ?? "DONE",
      slideCount: overrides?.slideCount ?? 10,
      orgId,
    },
  });

  return { id: reportId };
}

/**
 * Create a test Organization with a FREE subscription and add the user as OWNER.
 * Returns the org ID.
 */
export async function createTestOrganization(
  db: PrismaClient,
  userId: string,
): Promise<{ id: string }> {
  const orgId = crypto.randomUUID();
  const slug = `e2e-org-${crypto.randomUUID().slice(0, 8)}`;

  await db.organization.create({
    data: {
      id: orgId,
      name: "E2E Test Organization",
      slug,
    },
  });

  await db.subscription.create({
    data: {
      orgId,
      stripeCustomerId: `cus_e2e_${orgId}`,
      plan: "FREE",
    },
  });

  await db.membership.create({
    data: {
      userId,
      orgId,
      role: "OWNER",
    },
  });

  return { id: orgId };
}
