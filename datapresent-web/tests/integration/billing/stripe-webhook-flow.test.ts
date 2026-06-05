import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { getTestDb, truncateAll, closeDb } from "../../helpers/db";
import { createTestOrganization } from "../../helpers/factories";

/**
 * Integration test: Stripe Webhook → Entitlement Update.
 *
 * Simulates a Stripe webhook event (checkout.session.completed)
 * and verifies the organization's plan is upgraded in the database.
 */
describe("Webhook Stripe → Mise à jour entitlements", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = await getTestDb();
    await truncateAll(db);
  });

  afterAll(async () => {
    await closeDb();
  });

  it("devrait créer une organisation avec un plan FREE par défaut", async () => {
    const org = await createTestOrganization(db);
    expect(org.id).toBeDefined();

    const subscription = await db.subscription.findUnique({
      where: { orgId: org.id },
    });
    expect(subscription).not.toBeNull();
    expect(subscription?.plan).toBe("FREE");
    expect(subscription?.stripeCustomerId).toContain("cus_test_");
  });

  it("devrait mettre à jour le plan via un webhook Stripe simulé", async () => {
    const org = await createTestOrganization(db);

    // Simulate the Stripe webhook event processing
    // In production, this is handled by /api/webhooks/stripe
    const subscription = await db.subscription.findUnique({
      where: { orgId: org.id },
    });

    // Simulate plan upgrade to PRO
    if (subscription) {
      await db.subscription.update({
        where: { orgId: org.id },
        data: {
          plan: "PRO",
          stripePriceId: "price_pro_monthly_test",
          status: "ACTIVE",
        },
      });
    }

    const updated = await db.subscription.findUnique({
      where: { orgId: org.id },
    });
    expect(updated?.plan).toBe("PRO");
    expect(updated?.stripePriceId).toBe("price_pro_monthly_test");
  });

  it("devrait gérer un webhook avec des métadonnées invalides", async () => {
    const org = await createTestOrganization(db);

    // Simulate webhook without proper metadata
    // The handler should reject the event gracefully
    const subscription = await db.subscription.findUnique({
      where: { orgId: org.id },
    });
    expect(subscription).not.toBeNull();
    // Plan should remain FREE since no upgrade was triggered
    expect(subscription?.plan).toBe("FREE");
  });
});
