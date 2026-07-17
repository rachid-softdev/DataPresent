// ==========================================
// Feature Flags & Entitlements - Main Export
// ==========================================

// Cache
export {
  entitlementsCache,
  getCachedEntitlements,
  invalidateEntitlementsCache,
  setCachedEntitlements,
} from "./cache";
// Downgrade
export {
  applyDowngrade,
  downgradeService,
  getDowngradeInfo,
  getDowngradePreview,
} from "./downgrade";
// Experiments
export {
  calculateExperimentDistribution,
  getDistributionStats,
  getExperimentBucket,
  getExperimentConfig,
  isInExperiment,
  isInExperimentBucket,
} from "./experiments";
// Feature Gate (Main Service)
export {
  assertFeature,
  canConsume,
  consume,
  FeatureNotAvailableError,
  featureGateService,
  getAllEntitlements,
  getDebugTrace,
  getLimit,
  hasFeature,
  invalidateCache,
  LimitReachedError,
  SubscriptionExpiredError,
} from "./feature-gate";
// Middleware
export {
  createConsumeMiddleware,
  createFeatureMiddleware,
  createLimitMiddleware,
} from "./middleware";
export type { IEntitlementRepository } from "./repository";
// Repository
export { entitlementRepository } from "./repository";
// Types
export * from "./types";
