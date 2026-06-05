import type { PrismaClient, Plan, Sector } from "@prisma/client";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Test Data Factories
// Each factory creates a minimal valid entity with sensible defaults,
// allowing overrides for specific test scenarios.
// ---------------------------------------------------------------------------

export interface TestUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

let userCounter = 0;

/**
 * Create a test User with a hashed password and a stub JWT token.
 */
export async function createTestUser(
  db: PrismaClient,
  overrides?: {
    email?: string;
    name?: string;
    plan?: Plan;
    orgId?: string;
  },
): Promise<TestUser> {
  userCounter += 1;
  const email = overrides?.email || `test-user-${userCounter}-${Date.now()}@example.com`;
  const name = overrides?.name || "Test User";
  const userId = crypto.randomBytes(12).toString("hex");

  // Create user
  await db.user.create({
    data: {
      id: userId,
      email,
      name,
      isVerified: true,
    },
  });

  // Create password
  await db.password.create({
    data: {
      userId,
      hash: "$argon2id$v=19$m=65536,t=3,p=4$mockhash", // argon2 mock hash
    },
  });

  // If orgId is provided, create membership
  if (overrides?.orgId) {
    await db.membership.create({
      data: {
        userId,
        orgId: overrides.orgId,
        role: "OWNER",
      },
    });

    // Update subscription plan if specified
    if (overrides?.plan) {
      const sub = await db.subscription.findUnique({ where: { orgId: overrides.orgId } });
      if (sub) {
        await db.subscription.update({
          where: { orgId: overrides.orgId },
          data: { plan: overrides.plan },
        });
      }
    }
  }

  return {
    id: userId,
    email,
    name,
    token: `test-jwt-${userId}`,
  };
}

let orgCounter = 0;

/**
 * Create a test Organization with a FREE subscription.
 */
export async function createTestOrganization(
  db: PrismaClient,
  overrides?: {
    name?: string;
    slug?: string;
    plan?: Plan;
  },
) {
  orgCounter += 1;
  const name = overrides?.name || `Test Org ${orgCounter}`;
  const slug = overrides?.slug || `test-org-${orgCounter}-${Date.now()}`;
  const orgId = crypto.randomBytes(12).toString("hex");

  await db.organization.create({
    data: {
      id: orgId,
      name,
      slug,
    },
  });

  await db.subscription.create({
    data: {
      orgId,
      stripeCustomerId: `cus_test_${orgId}`,
      plan: overrides?.plan || "FREE",
    },
  });

  return { id: orgId, name, slug };
}

let reportCounter = 0;

/**
 * Create a test Report linked to an organization.
 */
export async function createTestReport(
  db: PrismaClient,
  orgId: string,
  overrides?: {
    title?: string;
    sector?: Sector;
    status?: "PENDING" | "PROCESSING" | "DONE" | "ERROR";
    slideCount?: number;
  },
) {
  reportCounter += 1;
  const reportId = crypto.randomBytes(12).toString("hex");

  await db.report.create({
    data: {
      id: reportId,
      title: overrides?.title || `Test Report ${reportCounter}`,
      sector: overrides?.sector || "GENERIC",
      status: overrides?.status || "PENDING",
      slideCount: overrides?.slideCount ?? 10,
      orgId,
    },
  });

  return { id: reportId };
}

/**
 * Create a mock File object for upload testing.
 */
export function createTestFile(filename: string = "test-data.xlsx", content?: Buffer): File {
  const buffer = content || Buffer.from("id,name,value\n1,test,100\n2,demo,200", "utf-8");
  return new File([buffer], filename, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
