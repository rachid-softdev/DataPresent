// ==========================================
// Plan Pricing Map — Stripe price IDs & display pricing
// This is the only static plan data that should remain in code.
// Feature flags and limits come from the DB-backed entitlement system.
//
// Env var naming: STRIPE_PRICE_* are named after the CURRENT plan tiers.
//   STARTER_MONTHLY -> STARTER, PRO_MONTHLY -> PRO
// Legacy aliases (pre-rename): TEAM_MONTHLY (old "Team" = current PRO) is
// kept as a fallback so existing deployments keep working.
// ==========================================

import type { Plan } from "@prisma/client";
import { env } from "@/env";

export interface PlanPricing {
  name: string;
  price: number; // monthly price in EUR; -1 = custom/contact
  stripePriceId: string | null;
}

export const PLAN_PRICING: Record<Plan, PlanPricing> = {
  FREE: {
    name: "Free",
    price: 0,
    stripePriceId: null,
  },
  STARTER: {
    name: "Starter",
    price: 19,
    stripePriceId: env.STRIPE_PRICE_STARTER_MONTHLY ?? null,
  },
  PRO: {
    name: "Pro",
    price: 49,
    stripePriceId: env.STRIPE_PRICE_PRO_MONTHLY ?? env.STRIPE_PRICE_TEAM_MONTHLY ?? null,
  },
  ULTRA: {
    name: "Ultra",
    price: -1,
    stripePriceId: null, // Contact sales
  },
};

export type PlanType = Plan;

export function getPlanPricing(plan: PlanType): PlanPricing {
  return PLAN_PRICING[plan] ?? PLAN_PRICING.FREE;
}

/**
 * Reverse lookup: resolve a Stripe price ID to a plan key.
 * Single source of truth — derived from PLAN_PRICING so the webhook mapping
 * can never drift from the checkout/plan-pricing configuration.
 * Unknown/empty price IDs resolve to FREE.
 */
export function getPlanFromStripePriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "FREE";
  for (const [plan, pricing] of Object.entries(PLAN_PRICING)) {
    if (pricing.stripePriceId === priceId) return plan as Plan;
  }
  return "FREE";
}
