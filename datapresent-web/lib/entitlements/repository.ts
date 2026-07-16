// ==========================================
// Entitlement Repository - Interface & Implementation
// ==========================================

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type {
  Plan,
  Subscription,
  Feature,
  PlanFeature,
  EntitlementOverride,
  UsageTracking,
  WebhookEvent,
} from "@prisma/client";
import type { FeatureKey, ExperimentConfig } from "./types";
import type { ConsumeResult, ConsumeSuccess } from "./types";

// ==========================================
// Interface
// ==========================================

// PlanFeature with the `feature` relation included (matching the `include: { feature: true }` query)
export type PlanFeatureWithFeature = PlanFeature & { feature: Feature };

export interface IEntitlementRepository {
  // Subscription
  getActiveSubscription(orgId: string): Promise<Subscription | null>;

  // Features & Plans
  getFeature(key: string): Promise<Feature | null>;
  getPlanFeatures(plan: Plan): Promise<PlanFeatureWithFeature[]>;
  getAllPlanFeatures(): Promise<PlanFeatureWithFeature[]>;

  // Overrides
  getUserOverride(userId: string, featureKey: string): Promise<EntitlementOverride | null>;
  getOrgOverrides(orgId: string): Promise<EntitlementOverride[]>;
  getAllOverrides(orgId: string, userId?: string): Promise<EntitlementOverride[]>;

  // Usage
  getUsage(orgId: string, featureKey: string): Promise<UsageTracking | null>;
  getAllUsage(orgId: string): Promise<UsageTracking[]>;

  // Atomic consume with RETURNING
  consumeUsage(
    orgId: string,
    featureKey: string,
    amount: number,
    limit: number | null,
  ): Promise<ConsumeResult>;

  // Idempotency
  isEventProcessed(eventId: string): Promise<boolean>;
  markEventProcessed(eventId: string, eventType: string): Promise<void>;

  // Create/Update overrides
  createOverride(data: {
    scope: "USER" | "ORG";
    scopeId: string;
    featureKey: string;
    enabled: boolean;
    limitValue?: number | null;
    expiresAt?: Date | null;
    reason: string;
    createdById: string;
  }): Promise<EntitlementOverride>;

  deleteOverride(id: string): Promise<void>;

  // Update subscription (for Stripe webhooks)
  updateSubscription(
    orgId: string,
    data: {
      plan?: Plan;
      status?: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
      stripeSubscriptionId?: string | null;
      stripePriceId?: string | null;
      currentPeriodEnd?: Date | null;
    },
  ): Promise<Subscription>;
}

// ==========================================
// Implementation
// ==========================================

export class PrismaEntitlementRepository implements IEntitlementRepository {
  /**
   * Get active subscription for an organization
   */
  async getActiveSubscription(orgId: string): Promise<Subscription | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { orgId },
    });

    if (!subscription) return null;

    // Check if subscription is active
    const isActive = ["ACTIVE", "TRIALING"].includes(subscription.status);

    return isActive ? subscription : null;
  }

  /**
   * Get a feature by key
   */
  async getFeature(key: string): Promise<Feature | null> {
    return prisma.feature.findUnique({
      where: { key },
    });
  }

  /**
   * Get all plan features for a specific plan
   */
  async getPlanFeatures(plan: Plan): Promise<PlanFeatureWithFeature[]> {
    const result = await prisma.planFeature.findMany({
      where: { plan },
      include: { feature: true },
    });
    return result as unknown as PlanFeatureWithFeature[];
  }

  /**
   * Get all plan features across all plans
   */
  async getAllPlanFeatures(): Promise<PlanFeatureWithFeature[]> {
    const result = await prisma.planFeature.findMany({
      include: { feature: true },
    });
    return result as unknown as PlanFeatureWithFeature[];
  }

  /**
   * Get user-level override (non-expired)
   */
  async getUserOverride(userId: string, featureKey: string): Promise<EntitlementOverride | null> {
    const now = new Date();
    return prisma.entitlementOverride.findFirst({
      where: {
        scope: "USER",
        scopeId: userId,
        featureKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get all org-level overrides (non-expired)
   */
  async getOrgOverrides(orgId: string): Promise<EntitlementOverride[]> {
    const now = new Date();
    return prisma.entitlementOverride.findMany({
      where: {
        scope: "ORG",
        scopeId: orgId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  /**
   * Get all overrides for org and optionally user
   */
  async getAllOverrides(orgId: string, userId?: string): Promise<EntitlementOverride[]> {
    const now = new Date();
    return prisma.entitlementOverride.findMany({
      where: {
        AND: [
          {
            OR: [
              // Org-level overrides
              { scope: "ORG" as const, scopeId: orgId },
              // User-level overrides
              ...(userId ? [{ scope: "USER" as const, scopeId: userId }] : []),
            ],
          },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        ],
      },
    });
  }

  /**
   * Get usage for a specific feature
   */
  async getUsage(orgId: string, featureKey: string): Promise<UsageTracking | null> {
    const now = new Date();
    return prisma.usageTracking.findFirst({
      where: {
        orgId,
        featureKey,
        periodEnd: { gt: now },
      },
      orderBy: { periodEnd: "desc" },
    });
  }

  /**
   * Get all usage records for an org
   */
  async getAllUsage(orgId: string): Promise<UsageTracking[]> {
    const now = new Date();
    return prisma.usageTracking.findMany({
      where: {
        orgId,
        periodEnd: { gt: now },
      },
      orderBy: { featureKey: "asc" },
    });
  }

  /**
   * Atomic consume using INSERT ... ON CONFLICT DO UPDATE
   * Eliminates race condition from read-then-write by using a single atomic SQL statement.
   */
  async consumeUsage(
    orgId: string,
    featureKey: string,
    amount: number,
    limit: number | null,
  ): Promise<ConsumeResult> {
    const now = new Date();

    // Get start and end of current month
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Pre-check: if no existing usage row and amount already exceeds limit, reject early.
    // This is a safety net; the ON CONFLICT WHERE clause handles the race on UPDATE path.
    if (limit !== null && amount > limit) {
      const existing = await this.getUsage(orgId, featureKey);
      if (!existing) {
        return {
          success: false,
          error: "LIMIT_REACHED",
          featureKey,
          limit,
          used: 0,
          resetAt: periodEnd,
        };
      }
    }

    // Build optional WHERE clause for limit check on DO UPDATE path
    const limitCondition =
      limit !== null
        ? Prisma.sql`WHERE "UsageTracking"."usageCount" + ${amount} <= ${limit}`
        : Prisma.empty;

    // Atomic INSERT ... ON CONFLICT DO UPDATE
    // - No existing row → INSERT succeeds (with the full amount)
    // - Existing row → UPDATE increments usageCount, WHERE clause enforces limit
    // - Row-level locking prevents concurrent INSERT/UPDATE races
    const rows = await prisma.$queryRaw<Array<{ usageCount: number }>>`
      INSERT INTO "UsageTracking" ("orgId", "featureKey", "usageCount", "periodStart", "periodEnd", "createdAt", "updatedAt")
      VALUES (${orgId}, ${featureKey}, ${amount}, ${periodStart}, ${periodEnd}, NOW(), NOW())
      ON CONFLICT ("orgId", "featureKey", "periodEnd")
      DO UPDATE SET
        "usageCount" = "UsageTracking"."usageCount" + ${amount},
        "updatedAt" = NOW()
      ${limitCondition}
      RETURNING "usageCount"
    `;

    if (rows.length > 0) {
      const newUsage = rows[0].usageCount;
      return {
        success: true,
        featureKey,
        previousUsage: newUsage - amount,
        newUsage,
        limit,
        remaining: limit !== null ? limit - newUsage : null,
      };
    }

    // No row returned — DO UPDATE was blocked by WHERE clause (limit exceeded)
    const existing = await this.getUsage(orgId, featureKey);
    return {
      success: false,
      error: "LIMIT_REACHED",
      featureKey,
      limit,
      used: existing?.usageCount ?? 0,
      resetAt: existing?.periodEnd ?? periodEnd,
    };
  }

  /**
   * Check if a webhook event has already been processed (idempotency)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const event = await prisma.webhookEvent.findUnique({
      where: { eventId },
    });
    return event !== null;
  }

  /**
   * Mark a webhook event as processed
   */
  async markEventProcessed(eventId: string, eventType: string): Promise<void> {
    await prisma.webhookEvent.upsert({
      where: { eventId },
      create: {
        eventId,
        eventType,
      },
      update: {
        processedAt: new Date(),
      },
    });
  }

  /**
   * Create an entitlement override
   */
  async createOverride(data: {
    scope: "USER" | "ORG";
    scopeId: string;
    featureKey: string;
    enabled: boolean;
    limitValue?: number | null;
    expiresAt?: Date | null;
    reason: string;
    createdById: string;
  }): Promise<EntitlementOverride> {
    return prisma.entitlementOverride.create({
      data: {
        scope: data.scope,
        scopeId: data.scopeId,
        featureKey: data.featureKey,
        enabled: data.enabled,
        limitValue: data.limitValue ?? null,
        expiresAt: data.expiresAt ?? null,
        reason: data.reason,
        createdById: data.createdById,
      },
    });
  }

  /**
   * Delete an entitlement override
   */
  async deleteOverride(id: string): Promise<void> {
    await prisma.entitlementOverride.delete({
      where: { id },
    });
  }

  /**
   * Update subscription (used by Stripe webhooks)
   */
  async updateSubscription(
    orgId: string,
    data: {
      plan?: Plan;
      status?: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";
      stripeSubscriptionId?: string | null;
      stripePriceId?: string | null;
      currentPeriodEnd?: Date | null;
    },
  ): Promise<Subscription> {
    return prisma.subscription.update({
      where: { orgId },
      data: {
        ...(data.plan !== undefined && { plan: data.plan }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.stripeSubscriptionId !== undefined && {
          stripeSubscriptionId: data.stripeSubscriptionId,
        }),
        ...(data.stripePriceId !== undefined && { stripePriceId: data.stripePriceId }),
        ...(data.currentPeriodEnd !== undefined && { currentPeriodEnd: data.currentPeriodEnd }),
      },
    });
  }
}

// ==========================================
// Singleton Instance
// ==========================================

export const entitlementRepository = new PrismaEntitlementRepository();
