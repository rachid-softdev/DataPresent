// ==========================================
// Feature Flags & Entitlements Types
// ==========================================

import type {
  Plan,
  SubscriptionStatus,
  FeatureType,
  DowngradeStrategy,
  OverrideScope,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type { Plan, SubscriptionStatus, FeatureType, DowngradeStrategy, OverrideScope };

// ==========================================
// Feature Types
// ==========================================

export type FeatureKey = string;

export interface ExperimentConfig {
  percentage: number;
  seed: string;
}

// ==========================================
// Debug Trace
// ==========================================

export type ResolutionSource = "user_override" | "org_override" | "plan" | "fallback";

export interface DebugTrace {
  featureKey: string;
  resolvedVia: ResolutionSource;
  value: boolean | number | null;
  overrideId?: string | null;
  expiresAt?: Date | null;
  planKey?: Plan | null;
  experimentConfig?: ExperimentConfig | null;
}

// ==========================================
// Entitlement Map
// ==========================================

export interface EntitlementMap {
  plan: Plan;
  status: SubscriptionStatus;
  features: Record<FeatureKey, boolean>;
  limits: Record<FeatureKey, number | null>;
  usage: Record<FeatureKey, number>;
  resetAt: Record<FeatureKey, Date | null>;
}

// ==========================================
// Consumption Result
// ==========================================

export interface ConsumeSuccess {
  success: true;
  featureKey: string;
  previousUsage: number;
  newUsage: number;
  limit: number | null;
  remaining: number | null;
}

export interface ConsumeFailure {
  success: false;
  error: "LIMIT_REACHED" | "FEATURE_NOT_AVAILABLE";
  featureKey: string;
  limit: number | null;
  used: number;
  resetAt: Date | null;
  upgradeUrl?: string;
}

export type ConsumeResult = ConsumeSuccess | ConsumeFailure;

// ==========================================
// API Response Types
// ==========================================

export interface EntitlementsAPIResponse {
  plan: Plan;
  features: Record<FeatureKey, boolean>;
  limits: Record<FeatureKey, number | null>;
  usage: Record<FeatureKey, number>;
  resetAt: Record<FeatureKey, string>;
}

// ==========================================
// Error Types
// ==========================================

export interface FeatureNotAvailableError {
  error: "FEATURE_NOT_AVAILABLE";
  feature: FeatureKey;
  planRequired: Plan;
  currentPlan: Plan;
  upgradeUrl: string;
}

export interface LimitReachedError {
  error: "LIMIT_REACHED";
  feature: FeatureKey;
  limit: number;
  used: number;
  resetAt: string;
  upgradeUrl: string;
}

export interface SubscriptionExpiredError {
  error: "SUBSCRIPTION_EXPIRED";
  renewUrl: string;
}

export type APIError = FeatureNotAvailableError | LimitReachedError | SubscriptionExpiredError;

// ==========================================
// Downgrade Types
// ==========================================

export interface DowngradePreview {
  featureKey: FeatureKey;
  currentlyEnabled: boolean;
  willBeEnabled: boolean;
  reason: "plan_downgrade" | "limit_exceeded";
  downgradeStrategy: DowngradeStrategy;
}

export interface DowngradeInfo {
  orgId: string;
  currentPlan: Plan;
  targetPlan: Plan;
  previews: DowngradePreview[];
  effectiveDate: Date | null; // null for IMMEDIATE, date for GRACEFUL
}

// ==========================================
// Override Types
// ==========================================

export interface CreateOverrideInput {
  scope: OverrideScope;
  scopeId: string; // userId or orgId
  featureKey: FeatureKey;
  enabled: boolean;
  limitValue?: number | null;
  expiresAt?: Date | null;
  reason: string;
}

// ==========================================
// Admin Types
// ==========================================

export interface FeatureWithPlanConfig {
  featureKey: string;
  description: string | null;
  type: FeatureType;
  isActive: boolean;
  defaultConfig: ExperimentConfig | null;
  plans: Record<
    Plan,
    {
      enabled: boolean;
      limitValue: number | null;
      configJson: ExperimentConfig | null;
      downgradeStrategy: DowngradeStrategy;
    }
  >;
}
