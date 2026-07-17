// ==========================================
// Plan Pricing Map — Stripe price IDs & display pricing
// This is the only static plan data that should remain in code.
// Feature flags and limits come from the DB-backed entitlement system.
// ==========================================

import { env } from "@/env";

export interface PlanPricing {
  name: string;
  price: number; // monthly price in EUR; -1 = custom/contact
  stripePriceId: string | null;
}

export const PLAN_PRICING: Record<string, PlanPricing> = {
  FREE: {
    name: "Free",
    price: 0,
    stripePriceId: null,
  },
  STARTER: {
    name: "Starter",
    price: 19,
    stripePriceId: env.STRIPE_PRICE_PRO_MONTHLY ?? null,
  },
  PRO: {
    name: "Pro",
    price: 49,
    stripePriceId: env.STRIPE_PRICE_TEAM_MONTHLY ?? null,
  },
  ULTRA: {
    name: "Ultra",
    price: -1,
    stripePriceId: null, // Contact sales
  },
};

export type PlanType = keyof typeof PLAN_PRICING;

export function getPlanPricing(plan: PlanType): PlanPricing {
  return PLAN_PRICING[plan] ?? PLAN_PRICING.FREE;
}
