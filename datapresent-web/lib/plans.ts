// Feature keys that can be checked with planHasFeature
export type PlanFeatureKey = 'reportsPerMonth' | 'maxSlides' | 'maxOrganizations' 
  | 'formatPPTX' | 'formatPDF' | 'formatDOCX'
  | 'collaboration' | 'watermark' | 'whiteLabel' 
  | 'apiAccess' | 'prioritySupport' | 'customDomain'

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

type FeatureKey = keyof typeof PLAN_FEATURES

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
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!,
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
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID!,
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

/**
 * Check if a plan has access to a specific feature
 */
export function planHasFeature(plan: PlanType, feature: PlanFeatureKey): boolean {
  const planConfig = PLANS[plan]
  if (!(feature in planConfig)) return false
  return Boolean(planConfig[feature as keyof typeof planConfig])
}

/**
 * Get the display price for a plan
 */
export function getPlanPrice(plan: PlanType): string {
  const planConfig = PLANS[plan]
  if (planConfig.price === -1) {
    return 'Custom'
  }
  return `€${planConfig.price}/mo`
}

/**
 * Check if a plan supports export format
 */
export function planSupportsFormat(plan: PlanType, format: 'PPTX' | 'PDF' | 'DOCX'): boolean {
  return PLANS[plan].formats.includes(format)
}
