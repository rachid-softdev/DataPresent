// ==========================================
// Feature Flags & Entitlements - Main Export
// ==========================================

// Types
export * from './types'

// Repository
export { entitlementRepository, IEntitlementRepository } from './repository'

// Cache
export {
  entitlementsCache,
  getCachedEntitlements,
  setCachedEntitlements,
  invalidateEntitlementsCache,
} from './cache'

// Feature Gate (Main Service)
export {
  featureGateService,
  hasFeature,
  getLimit,
  assertFeature,
  canConsume,
  consume,
  getAllEntitlements,
  getDebugTrace,
  invalidateCache,
  FeatureNotAvailableError,
  LimitReachedError,
  SubscriptionExpiredError,
} from './feature-gate'

// Experiments
export {
  isInExperiment,
  getExperimentConfig,
  getExperimentBucket,
  isInExperimentBucket,
  calculateExperimentDistribution,
  getDistributionStats,
} from './experiments'

// Downgrade
export {
  downgradeService,
  getDowngradePreview,
  getDowngradeInfo,
  applyDowngrade,
} from './downgrade'

// Middleware
export {
  createFeatureMiddleware,
  createLimitMiddleware,
  createConsumeMiddleware,
} from './middleware'

// Stripe Webhook
export {
  handleWebhookEvent,
  constructWebhookEvent,
  verifyWebhookSignature,
  isEventProcessed,
  markEventProcessed,
  parseWebhookBody,
} from '../stripe-webhook-handler'
