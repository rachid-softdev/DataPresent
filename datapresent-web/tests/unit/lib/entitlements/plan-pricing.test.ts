// ==========================================
// Plan Pricing Tests (Item 10)
// ==========================================
//
// Tests for plan-pricing.ts:
// - getPlanPricing returns correct data for all plans
// - Fallback for unknown plan
// - All plan types have required fields
//
// IMPORTANT: plan-pricing.ts imports { env } from "@/env", which validates
// ALL required env vars at import time via env.ts (Zod schema).
// Tests must stub all required env vars before dynamically importing
// plan-pricing. The same required stubs are defined in tests/setup.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Plan Pricing (plan-pricing.ts)", () => {
  beforeEach(() => {
    vi.resetModules();

    // Required env vars for env.ts validation (mirrors tests/setup.ts)
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CSRF_SECRET", "test-secret-key-for-testing-12345678");
    vi.stubEnv("NEXTAUTH_SECRET", "test-nextauth-secret-for-testing-123456");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key-for-testing-1234567890abcdef");
    vi.stubEnv("JOB_SIGNING_SECRET", "test-job-signing-secret-for-testing-12345678");

    // Stripe price IDs under test
    vi.stubEnv("STRIPE_PRICE_PRO_MONTHLY", "price_pro_monthly_test");
    vi.stubEnv("STRIPE_PRICE_TEAM_MONTHLY", "price_team_monthly_test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  // ======================================================================
  // Plan pricing data verification
  // ======================================================================

  it("should return Free plan with price 0 and null stripePriceId", async () => {
    const { getPlanPricing } = await import("@/lib/entitlements/plan-pricing");
    const pricing = getPlanPricing("FREE");

    expect(pricing).toEqual({
      name: "Free",
      price: 0,
      stripePriceId: null,
    });
  });

  it("should return Starter plan with price 19 and stripePriceId from env", async () => {
    const { getPlanPricing } = await import("@/lib/entitlements/plan-pricing");
    const pricing = getPlanPricing("STARTER");

    expect(pricing).toEqual({
      name: "Starter",
      price: 19,
      stripePriceId: "price_pro_monthly_test",
    });
  });

  it("should return Pro plan with price 49 and stripePriceId from env", async () => {
    const { getPlanPricing } = await import("@/lib/entitlements/plan-pricing");
    const pricing = getPlanPricing("PRO");

    expect(pricing).toEqual({
      name: "Pro",
      price: 49,
      stripePriceId: "price_team_monthly_test",
    });
  });

  it("should return Ultra plan with price -1 (custom) and null stripePriceId", async () => {
    const { getPlanPricing } = await import("@/lib/entitlements/plan-pricing");
    const pricing = getPlanPricing("ULTRA");

    expect(pricing).toEqual({
      name: "Ultra",
      price: -1,
      stripePriceId: null,
    });
  });

  // ======================================================================
  // Edge cases
  // ======================================================================

  it("should fall back to Free plan for unknown plan type", async () => {
    const { getPlanPricing } = await import("@/lib/entitlements/plan-pricing");
    const pricing = getPlanPricing("UNKNOWN" as any);

    // The function returns FREE as default fallback
    expect(pricing).toEqual({
      name: "Free",
      price: 0,
      stripePriceId: null,
    });
  });

  it("should expose PLAN_PRICING constant with correct keys", async () => {
    const { PLAN_PRICING } = await import("@/lib/entitlements/plan-pricing");

    expect(Object.keys(PLAN_PRICING)).toEqual(["FREE", "STARTER", "PRO", "ULTRA"]);
  });

  it("should expose PlanType as union of plan keys", async () => {
    const { PLAN_PRICING } = await import("@/lib/entitlements/plan-pricing");

    // Verify all plan types exist
    for (const plan of ["FREE", "STARTER", "PRO", "ULTRA"] as const) {
      expect(PLAN_PRICING[plan]).toBeDefined();
      expect(PLAN_PRICING[plan].name).toBeDefined();
      expect(typeof PLAN_PRICING[plan].price).toBe("number");
    }
  });

  it("should handle missing stripe env vars gracefully by returning null", async () => {
    // Reset modules and all env stubs
    vi.resetModules();
    vi.unstubAllEnvs();

    // Stub required env vars (for env.ts validation) but NOT stripe prices
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("CSRF_SECRET", "test-secret-key-for-testing-12345678");
    vi.stubEnv("NEXTAUTH_SECRET", "test-nextauth-secret-for-testing-123456");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test-key-for-testing-1234567890abcdef");
    vi.stubEnv("JOB_SIGNING_SECRET", "test-job-signing-secret-for-testing-12345678");

    const { getPlanPricing } = await import("@/lib/entitlements/plan-pricing");

    // When stripe price env vars are missing, env.STRIPE_PRICE_* will be
    // undefined, and the ?? null fallback in plan-pricing.ts returns null.
    const starter = getPlanPricing("STARTER");
    expect(starter.price).toBe(19);
    expect(starter.stripePriceId).toBeNull();

    const pro = getPlanPricing("PRO");
    expect(pro.price).toBe(49);
    expect(pro.stripePriceId).toBeNull();
  });
});
