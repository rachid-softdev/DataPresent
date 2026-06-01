// ==========================================
// Compatibility Adapter - Legacy Plan Utils
// ==========================================
// This file provides backwards compatibility for code that imports from
// @/lib/plans or @/lib/plan-utils. New code should use the entitlement
// system directly via @/lib/entitlements.
// Once all consumers have been migrated, this file can be removed.

import { prisma } from '../prisma.js'
import { env } from '../env.js'
import { featureGateService } from './feature-gate'

// ==========================================
// Static Plan Configuration
// ==========================================

export type PlanFeatureKey =
  | 'reportsPerMonth'
  | 'maxSlides'
  | 'maxOrganizations'
  | 'formatPPTX'
  | 'formatPDF'
  | 'formatDOCX'
  | 'collaboration'
  | 'watermark'
  | 'whiteLabel'
  | 'apiAccess'
  | 'prioritySupport'
  | 'customDomain'

export const PLAN_FEATURES = {
  reports: [
    { name: 'Rapports/mois', key: 'reportsPerMonth' },
    { name: 'Diapositives max', key: 'maxSlides' },
    { name: 'Organisations', key: 'maxOrganizations' },
  ],
  exports: [
    { name: 'PPTX', key: 'formatPPTX' },
    { name: 'PDF', key: 'formatPDF' },
    { name: 'DOCX', key: 'formatDOCX' },
  ],
  collaboration: [{ name: 'Collaboration équipe', key: 'collaboration' }],
  professional: [
    { name: 'Watermark', key: 'watermark', inverse: true },
    { name: 'White-label', key: 'whiteLabel' },
    { name: 'Domaine personnalisé', key: 'customDomain' },
    { name: 'Accès API', key: 'apiAccess' },
  ],
  support: [{ name: 'Support prioritaire', key: 'prioritySupport' }],
} as const

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    reportsPerMonth: 3,
    maxSlides: 8,
    maxOrganizations: 1,
    formatPPTX: true,
    formatPDF: false,
    formatDOCX: false,
    formats: ['PPTX'] as const,
    collaboration: false,
    watermark: true,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
    stripePriceId: null,
  },
  PRO: {
    name: 'Pro',
    price: 19,
    reportsPerMonth: 30,
    maxSlides: 20,
    maxOrganizations: 1,
    formatPPTX: true,
    formatPDF: true,
    formatDOCX: true,
    formats: ['PPTX', 'PDF', 'DOCX'] as const,
    collaboration: false,
    watermark: false,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
    stripePriceId: env.STRIPE_PRICE_PRO_MONTHLY ?? null,
  },
  TEAM: {
    name: 'Team',
    price: 49,
    reportsPerMonth: -1,
    maxSlides: 30,
    maxOrganizations: -1,
    formatPPTX: true,
    formatPDF: true,
    formatDOCX: true,
    formats: ['PPTX', 'PDF', 'DOCX'] as const,
    collaboration: true,
    watermark: false,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
    stripePriceId: env.STRIPE_PRICE_TEAM_MONTHLY ?? null,
  },
  AGENCY: {
    name: 'Agency',
    price: -1,
    reportsPerMonth: -1,
    maxSlides: -1,
    maxOrganizations: -1,
    formatPPTX: true,
    formatPDF: true,
    formatDOCX: true,
    formats: ['PPTX', 'PDF', 'DOCX'] as const,
    collaboration: true,
    watermark: false,
    whiteLabel: true,
    apiAccess: true,
    prioritySupport: true,
    customDomain: true,
    stripePriceId: null,
  },
} as const

export type PlanType = keyof typeof PLANS

// ==========================================
// Sync Utility Functions
// ==========================================

export function planHasFeature(plan: PlanType, feature: PlanFeatureKey): boolean {
  const planConfig = PLANS[plan]
  if (!(feature in planConfig)) return false
  return Boolean(planConfig[feature as keyof typeof planConfig])
}

export function getPlanPrice(plan: PlanType): string {
  const planConfig = PLANS[plan]
  if (planConfig.price === -1) {
    return 'Custom'
  }
  return `€${planConfig.price}/mo`
}

export function planSupportsFormat(plan: PlanType, format: 'PPTX' | 'PDF' | 'DOCX'): boolean {
  return PLANS[plan].formats.includes(format)
}

export function canUseFormat(plan: PlanType, format: string): boolean {
  return PLANS[plan].formats.includes(format as any)
}

export function canHaveSlideCount(
  plan: PlanType,
  slideCount: number
): {
  allowed: boolean
  maxSlides: number
} {
  const maxSlides = PLANS[plan].maxSlides
  const allowed = maxSlides === -1 ? true : slideCount <= maxSlides
  return { allowed, maxSlides }
}

// ==========================================
// Async Functions (backed by new entitlement system)
// ==========================================

export async function getUserPlan(userId: string): Promise<{
  plan: PlanType
  orgId: string
  planConfig: (typeof PLANS)[PlanType]
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      membership: {
        include: {
          org: {
            include: { subscription: true },
          },
        },
      },
    },
  })

  const membership = user?.membership[0]
  if (!membership) {
    return {
      plan: 'FREE',
      orgId: '',
      planConfig: PLANS.FREE,
    }
  }

  const plan = (membership.org.subscription?.plan || 'FREE') as PlanType
  return {
    plan,
    orgId: membership.orgId,
    planConfig: PLANS[plan],
  }
}

export async function canCreateReport(userId: string): Promise<{
  allowed: boolean
  reason?: string
  upgrade?: boolean
}> {
  const { plan, orgId, planConfig } = await getUserPlan(userId)

  // Use new entitlement system for consumption check
  const canConsume = await featureGateService.canConsume(orgId, 'reportsPerMonth', 1)

  if (!canConsume) {
    // Check if the feature is available at all
    const hasFeature = await featureGateService.hasFeature(orgId, 'reportsPerMonth')
    const limit = await featureGateService.getLimit(orgId, 'reportsPerMonth')

    if (!hasFeature || (limit !== null && limit === 0)) {
      return {
        allowed: false,
        reason: `Feature non disponible sur le plan ${PLANS[plan].name}.`,
        upgrade: true,
      }
    }

    return {
      allowed: false,
      reason: `Limite de ${planConfig.reportsPerMonth} rapports/mois atteinte sur le plan ${PLANS[plan].name}.`,
      upgrade: true,
    }
  }

  return { allowed: true }
}

export async function getRemainingReports(userId: string): Promise<{
  remaining: number
  total: number
  resetDate: Date
}> {
  const { orgId, planConfig } = await getUserPlan(userId)

  // Use entitlement system for usage data
  const entitlements = await featureGateService.getAllEntitlements(orgId)
  const usage = entitlements.usage['reportsPerMonth'] ?? 0
  const limit = entitlements.limits['reportsPerMonth']

  if (limit === null || planConfig.reportsPerMonth === -1) {
    return { remaining: -1, total: -1, resetDate: new Date() }
  }

  const resetDate = entitlements.resetAt['reportsPerMonth'] ?? new Date()

  return {
    remaining: Math.max(0, limit - usage),
    total: limit,
    resetDate,
  }
}
