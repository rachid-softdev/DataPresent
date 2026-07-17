// ==========================================
// Stripe Tests
// ==========================================

import { describe, expect, it, vi } from "vitest";

// Mock env to prevent module-level validation at import time
vi.mock("@/env", () => ({
  env: {
    NODE_ENV: "test",
    STRIPE_SECRET_KEY: undefined,
    STRIPE_WEBHOOK_SECRET: undefined,
    STRIPE_PRICE_PRO_MONTHLY: undefined,
    STRIPE_PRICE_TEAM_MONTHLY: undefined,
    STRIPE_PRICE_STARTER_MONTHLY: undefined,
  },
  isFeatureEnabled: vi.fn((feature: string) => {
    if (feature === "stripe") return false;
    return false;
  }),
}));

describe("stripe", () => {
  it("should export getStripe function (named export only, no stripe instance)", async () => {
    const mod = await import("@/lib/stripe");
    expect(mod.getStripe).toBeDefined();
    expect(mod.stripe).toBeUndefined();
  });

  it("should throw when getStripe called without STRIPE_SECRET_KEY", async () => {
    const { getStripe } = await import("@/lib/stripe");
    expect(() => getStripe()).toThrow("Stripe is not configured");
  });
});
