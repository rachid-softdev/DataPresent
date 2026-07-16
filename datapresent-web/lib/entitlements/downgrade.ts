// ==========================================
// Downgrade Service - Handle Plan Downgrades
// ==========================================

import { prisma } from "@/lib/prisma";
import type { Plan, DowngradeStrategy, SubscriptionStatus } from "@prisma/client";
import type { DowngradePreview, DowngradeInfo } from "./types";
import { entitlementRepository } from "./repository";
import { getAllEntitlements, invalidateCache } from "./feature-gate";
import { captureMessage } from "@/lib/sentry";

// ==========================================
// Downgrade Service Class
// ==========================================

export class DowngradeService {
  /**
   * Get preview of what features will be affected by a downgrade
   * Shows which features will be disabled and why
   */
  async getDowngradePreview(orgId: string, targetPlan: Plan): Promise<DowngradePreview[]> {
    // Get current subscription
    const subscription = await entitlementRepository.getActiveSubscription(orgId);
    const currentPlan = subscription?.plan ?? "FREE";

    // Don't show preview if same or higher plan
    if (
      targetPlan === currentPlan ||
      this.getPlanPriority(targetPlan) >= this.getPlanPriority(currentPlan)
    ) {
      return [];
    }

    // Get all plan features for both plans
    const currentPlanFeatures = await entitlementRepository.getPlanFeatures(currentPlan);
    const targetPlanFeatures = await entitlementRepository.getPlanFeatures(targetPlan);

    // Get current entitlements to check usage
    const entitlements = await getAllEntitlements(orgId);

    const previews: DowngradePreview[] = [];

    // Compare each feature
    for (const currentPf of currentPlanFeatures) {
      const featureKey = currentPf.feature.key;

      // Skip if feature is not enabled in current plan
      if (!currentPf.enabled) continue;

      const targetPf = targetPlanFeatures.find((pf) => pf.feature.key === featureKey);

      // Feature will be disabled or limited in target plan
      const willBeEnabled = targetPf?.enabled ?? false;

      // Determine reason
      let reason: "plan_downgrade" | "limit_exceeded" = "plan_downgrade";

      if (targetPf?.enabled && targetPf.limitValue !== null && targetPf.limitValue !== undefined) {
        // Check if current usage exceeds new limit
        const currentUsage = entitlements.usage[featureKey] ?? 0;
        if (currentUsage > targetPf.limitValue) {
          reason = "limit_exceeded";
        }
      }

      previews.push({
        featureKey,
        currentlyEnabled: true,
        willBeEnabled,
        reason,
        downgradeStrategy: targetPf?.downgradeStrategy ?? "IMMEDIATE",
      });
    }

    // Sort by feature key
    return previews.sort((a, b) => a.featureKey.localeCompare(b.featureKey));
  }

  /**
   * Get full downgrade info with effective date
   */
  async getDowngradeInfo(orgId: string, targetPlan: Plan): Promise<DowngradeInfo | null> {
    const subscription = await entitlementRepository.getActiveSubscription(orgId);
    const currentPlan = subscription?.plan ?? "FREE";

    // Don't provide info if same or higher plan
    if (
      targetPlan === currentPlan ||
      this.getPlanPriority(targetPlan) >= this.getPlanPriority(currentPlan)
    ) {
      return null;
    }

    const previews = await this.getDowngradePreview(orgId, targetPlan);

    // Calculate effective date based on strategy
    // Graceful: until period end, Immediate: now, Freeze: now
    let effectiveDate: Date | null = null;

    const hasGracefulFeature = previews.some((p) => p.downgradeStrategy === "GRACEFUL");
    if (hasGracefulFeature && subscription?.currentPeriodEnd) {
      effectiveDate = subscription.currentPeriodEnd;
    }

    return {
      orgId,
      currentPlan,
      targetPlan,
      previews,
      effectiveDate,
    };
  }

  /**
   * Apply downgrade with specified strategy
   * This is typically called from Stripe webhook handler
   */
  async applyDowngrade(
    orgId: string,
    targetPlan: Plan,
    overrideStrategy?: DowngradeStrategy,
  ): Promise<void> {
    const subscription = await entitlementRepository.getActiveSubscription(orgId);
    const currentPlan = subscription?.plan ?? "FREE";

    // Don't apply if same or higher plan
    if (
      targetPlan === currentPlan ||
      this.getPlanPriority(targetPlan) >= this.getPlanPriority(currentPlan)
    ) {
      return;
    }

    const previews = await this.getDowngradePreview(orgId, targetPlan);

    // Determine strategy to use
    const strategy = overrideStrategy ?? this.determineStrategy(previews);

    switch (strategy) {
      case "GRACEFUL":
        // Keep current plan active until period end
        // Features will be cut off at period end via scheduled job
        captureMessage(`Downgrade GRACEFUL applied for org ${orgId}`, "info", {
          currentPlan,
          targetPlan,
          effectiveDate: subscription?.currentPeriodEnd,
        });
        // Could trigger email notification here
        break;

      case "IMMEDIATE":
        // Update subscription plan immediately
        await entitlementRepository.updateSubscription(orgId, {
          plan: targetPlan,
        });
        await invalidateCache(orgId);

        captureMessage(`Downgrade IMMEDIATE applied for org ${orgId}`, "info", {
          currentPlan,
          targetPlan,
        });
        break;

      case "FREEZE":
        // Don't change subscription but flag for freeze
        // Feature consumption will be blocked but data kept
        captureMessage(`Downgrade FREEZE applied for org ${orgId}`, "info", {
          currentPlan,
          targetPlan,
        });
        // Could set a flag in subscription metadata or separate table
        break;
    }
  }

  /**
   * Check if organization is in grace period (graceful downgrade scenario)
   */
  async isInGracePeriod(orgId: string): Promise<boolean> {
    const subscription = await entitlementRepository.getActiveSubscription(orgId);

    if (!subscription) return false;
    if (!subscription.currentPeriodEnd) return false;

    // Check if we're in the last 7 days of the period
    const now = new Date();
    const daysUntilEnd = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysUntilEnd > 0 && daysUntilEnd <= 7;
  }

  /**
   * Get organizations approaching downgrade (for scheduled job)
   */
  async getOrgsApproachingDowngrade(daysThreshold: number = 7): Promise<
    {
      orgId: string;
      currentPlan: Plan;
      daysUntilEnd: number;
    }[]
  > {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysThreshold);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ["ACTIVE", "TRIALING"] },
        plan: { not: "FREE" },
        currentPeriodEnd: {
          lte: futureDate,
          gte: new Date(), // Only future dates
        },
      },
      select: {
        orgId: true,
        plan: true,
        currentPeriodEnd: true,
      },
    });

    const now = new Date();

    return subscriptions
      .map((sub) => ({
        orgId: sub.orgId,
        currentPlan: sub.plan,
        daysUntilEnd: Math.ceil(
          (sub.currentPeriodEnd!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      }))
      .filter((r) => r.daysUntilEnd > 0)
      .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
  }

  // ==========================================
  // Private Helpers
  // ==========================================

  /**
   * Get plan priority for comparison
   */
  private getPlanPriority(plan: Plan): number {
    const priorities: Record<Plan, number> = {
      FREE: 0,
      STARTER: 1,
      PRO: 2,
      ULTRA: 3,
    };
    return priorities[plan] ?? 0;
  }

  /**
   * Determine overall downgrade strategy based on feature strategies
   */
  private determineStrategy(previews: DowngradePreview[]): DowngradeStrategy {
    if (previews.length === 0) return "IMMEDIATE";

    // If any feature uses graceful, use graceful
    const hasGraceful = previews.some((p) => p.downgradeStrategy === "GRACEFUL");
    if (hasGraceful) return "GRACEFUL";

    // If any feature uses freeze, use freeze
    const hasFreeze = previews.some((p) => p.downgradeStrategy === "FREEZE");
    if (hasFreeze) return "FREEZE";

    // Default to immediate
    return "IMMEDIATE";
  }
}

// ==========================================
// Singleton Instance
// ==========================================

export const downgradeService = new DowngradeService();

// ==========================================
// Convenience Functions
// ==========================================

export async function getDowngradePreview(
  orgId: string,
  targetPlan: Plan,
): Promise<DowngradePreview[]> {
  return downgradeService.getDowngradePreview(orgId, targetPlan);
}

export async function getDowngradeInfo(
  orgId: string,
  targetPlan: Plan,
): Promise<DowngradeInfo | null> {
  return downgradeService.getDowngradeInfo(orgId, targetPlan);
}

export async function applyDowngrade(
  orgId: string,
  targetPlan: Plan,
  strategy?: DowngradeStrategy,
): Promise<void> {
  return downgradeService.applyDowngrade(orgId, targetPlan, strategy);
}
