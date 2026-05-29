// ==========================================
// Entitlement Repository - Interface & Implementation
// ==========================================

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type {
  Plan,
  Subscription,
  Feature,
  PlanFeature,
  EntitlementOverride,
  UsageTracking,
  WebhookEvent,
} from '@prisma/client'
import type { FeatureKey, ExperimentConfig } from './types'
import type { ConsumeResult, ConsumeSuccess } from './types'

// ==========================================
// Interface
// ==========================================

export interface IEntitlementRepository {
  // Subscription
  getActiveSubscription(orgId: string): Promise<Subscription | null>

  // Features & Plans
  getFeature(key: string): Promise<Feature | null>
  getPlanFeatures(plan: Plan): Promise<PlanFeature[]>
  getAllPlanFeatures(): Promise<PlanFeature[]>

  // Overrides
  getUserOverride(userId: string, featureKey: string): Promise<EntitlementOverride | null>
  getOrgOverrides(orgId: string): Promise<EntitlementOverride[]>
  getAllOverrides(orgId: string, userId?: string): Promise<EntitlementOverride[]>

  // Usage
  getUsage(orgId: string, featureKey: string): Promise<UsageTracking | null>
  getAllUsage(orgId: string): Promise<UsageTracking[]>

  // Atomic consume with RETURNING
  consumeUsage(
    orgId: string,
    featureKey: string,
    amount: number,
    limit: number | null
  ): Promise<ConsumeResult>

  // Idempotency
  isEventProcessed(eventId: string): Promise<boolean>
  markEventProcessed(eventId: string, eventType: string): Promise<void>

  // Create/Update overrides
  createOverride(data: {
    scope: 'USER' | 'ORG'
    scopeId: string
    featureKey: string
    enabled: boolean
    limitValue?: number | null
    expiresAt?: Date | null
    reason: string
    createdById: string
  }): Promise<EntitlementOverride>

  deleteOverride(id: string): Promise<void>

  // Update subscription (for Stripe webhooks)
  updateSubscription(
    orgId: string,
    data: {
      plan?: Plan
      status?: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING'
      stripeSubscriptionId?: string | null
      stripePriceId?: string | null
      currentPeriodEnd?: Date | null
    }
  ): Promise<Subscription>
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
    })

    if (!subscription) return null

    // Check if subscription is active
    const isActive = ['ACTIVE', 'TRIALING'].includes(subscription.status)

    return isActive ? subscription : null
  }

  /**
   * Get a feature by key
   */
  async getFeature(key: string): Promise<Feature | null> {
    return prisma.feature.findUnique({
      where: { key },
    })
  }

  /**
   * Get all plan features for a specific plan
   */
  async getPlanFeatures(plan: Plan): Promise<PlanFeature[]> {
    return prisma.planFeature.findMany({
      where: { plan },
      include: { feature: true },
    })
  }

  /**
   * Get all plan features across all plans
   */
  async getAllPlanFeatures(): Promise<PlanFeature[]> {
    return prisma.planFeature.findMany({
      include: { feature: true },
    })
  }

  /**
   * Get user-level override (non-expired)
   */
  async getUserOverride(userId: string, featureKey: string): Promise<EntitlementOverride | null> {
    const now = new Date()
    return prisma.entitlementOverride.findFirst({
      where: {
        scope: 'USER',
        scopeId: userId,
        featureKey,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Get all org-level overrides (non-expired)
   */
  async getOrgOverrides(orgId: string): Promise<EntitlementOverride[]> {
    const now = new Date()
    return prisma.entitlementOverride.findMany({
      where: {
        scope: 'ORG',
        scopeId: orgId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    })
  }

  /**
   * Get all overrides for org and optionally user
   */
  async getAllOverrides(orgId: string, userId?: string): Promise<EntitlementOverride[]> {
    const now = new Date()
    return prisma.entitlementOverride.findMany({
      where: {
        OR: [
          // Org-level overrides
          { scope: 'ORG', scopeId: orgId },
          // User-level overrides
          ...(userId ? [{ scope: 'USER', scopeId: userId }] : []),
        ],
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    })
  }

  /**
   * Get usage for a specific feature
   */
  async getUsage(orgId: string, featureKey: string): Promise<UsageTracking | null> {
    const now = new Date()
    return prisma.usageTracking.findFirst({
      where: {
        orgId,
        featureKey,
        periodEnd: { gt: now },
      },
      orderBy: { periodEnd: 'desc' },
    })
  }

  /**
   * Get all usage records for an org
   */
  async getAllUsage(orgId: string): Promise<UsageTracking[]> {
    const now = new Date()
    return prisma.usageTracking.findMany({
      where: {
        orgId,
        periodEnd: { gt: now },
      },
      orderBy: { featureKey: 'asc' },
    })
  }

  /**
   * Atomic consume with PostgreSQL RETURNING clause
   * Prevents race conditions by using conditional UPDATE
   */
  async consumeUsage(
    orgId: string,
    featureKey: string,
    amount: number,
    limit: number | null
  ): Promise<ConsumeResult> {
    const now = new Date()

    // Get start and end of current month
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Build conditional SQL for limit check
    const limitCondition = limit !== null
      ? Prisma.sql`AND "usageCount" + ${amount} <= ${limit}`
      : Prisma.empty

    let result = (await prisma.$queryRaw`
      UPDATE "UsageTracking"
      SET "usageCount" = "usageCount" + ${amount},
          "updatedAt" = NOW()
      WHERE "orgId" = ${orgId}
        AND "featureKey" = ${featureKey}
        AND "periodEnd" > NOW()
      ${limitCondition}
      RETURNING "usageCount"
    `) as unknown as { usageCount: number } | { usageCount: number }[]

    // If no row was updated, create new tracking or limit was reached
    if (!result || (Array.isArray(result) && result.length === 0)) {
      // Check if there's existing tracking to determine if limit was reached
      const existing = await this.getUsage(orgId, featureKey)

      if (existing) {
        // Limit was reached or period expired
        const currentUsage = existing.usageCount
        const wouldExceed = limit !== null && currentUsage + amount > limit

        if (wouldExceed || limit === 0) {
          return {
            success: false,
            error: 'LIMIT_REACHED',
            featureKey,
            limit,
            used: currentUsage,
            resetAt: existing.periodEnd,
          }
        }
        
        // Period expired but limit not reached — this shouldn't happen normally
        // Update the existing record for the new period
        await prisma.usageTracking.update({
          where: { id: existing.id },
          data: {
            usageCount: existing.usageCount + amount,
            periodStart,
            periodEnd,
          },
        })
        
        return {
          success: true,
          featureKey,
          previousUsage: existing.usageCount,
          newUsage: existing.usageCount + amount,
          limit,
          remaining: limit !== null ? limit - (existing.usageCount + amount) : null,
        }
      }

      // No existing tracking — check limit BEFORE creating
      if (limit !== null && amount > limit) {
        return {
          success: false,
          error: 'LIMIT_REACHED',
          featureKey,
          limit,
          used: 0,
          resetAt: periodEnd,
        }
      }

      // Create new usage tracking for new period
      try {
        await prisma.usageTracking.create({
          data: {
            orgId,
            featureKey,
            usageCount: amount,
            periodStart,
            periodEnd,
          },
        })
      } catch (err: any) {
        // Handle unique constraint violation (race condition — another request created the row)
        if (err?.code === 'P2002') {
          // Retry the UPDATE
          const updateResult = await prisma.$queryRaw`
            UPDATE "UsageTracking"
            SET "usageCount" = "usageCount" + ${amount},
                "updatedAt" = NOW()
            WHERE "orgId" = ${orgId}
              AND "featureKey" = ${featureKey}
              AND "periodEnd" > NOW()
            RETURNING "usageCount"
          ` as unknown as { usageCount: number }[]
          
          if (updateResult && updateResult.length > 0) {
            const newUsage = updateResult[0].usageCount
            return {
              success: true,
              featureKey,
              previousUsage: newUsage - amount,
              newUsage,
              limit,
              remaining: limit !== null ? limit - newUsage : null,
            }
          }
          
          return {
            success: false,
            error: 'LIMIT_REACHED',
            featureKey,
            limit,
            used: 0,
            resetAt: periodEnd,
          }
        }
        throw err
      }

      return {
        success: true,
        featureKey,
        previousUsage: 0,
        newUsage: amount,
        limit,
        remaining: limit !== null ? limit - amount : null,
      }
    }

    const resultArray = Array.isArray(result) ? result : [result]
    const newUsage = resultArray[0]?.usageCount ?? amount

    return {
      success: true,
      featureKey,
      previousUsage: newUsage - amount,
      newUsage,
      limit,
      remaining: limit !== null ? limit - newUsage : null,
    }
  }

  /**
   * Check if a webhook event has already been processed (idempotency)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    const event = await prisma.webhookEvent.findUnique({
      where: { eventId },
    })
    return event !== null
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
    })
  }

  /**
   * Create an entitlement override
   */
  async createOverride(data: {
    scope: 'USER' | 'ORG'
    scopeId: string
    featureKey: string
    enabled: boolean
    limitValue?: number | null
    expiresAt?: Date | null
    reason: string
    createdById: string
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
    })
  }

  /**
   * Delete an entitlement override
   */
  async deleteOverride(id: string): Promise<void> {
    await prisma.entitlementOverride.delete({
      where: { id },
    })
  }

  /**
   * Update subscription (used by Stripe webhooks)
   */
  async updateSubscription(
    orgId: string,
    data: {
      plan?: Plan
      status?: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING'
      stripeSubscriptionId?: string | null
      stripePriceId?: string | null
      currentPeriodEnd?: Date | null
    }
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
    })
  }
}

// ==========================================
// Singleton Instance
// ==========================================

export const entitlementRepository = new PrismaEntitlementRepository()
