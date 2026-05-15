export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    reportsPerMonth: 3,
    maxSlides: 8,
    maxOrganizations: 1,
    formats: ["PPTX"] as const,
    collaboration: false,
    watermark: true,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
    stripePriceId: null,
  },
  PRO: {
    name: "Pro",
    price: 19,
    reportsPerMonth: 30,
    maxSlides: 20,
    maxOrganizations: 1,
    formats: ["PPTX", "PDF", "DOCX"] as const,
    collaboration: false,
    watermark: false,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
  TEAM: {
    name: "Team",
    price: 49,
    reportsPerMonth: -1,
    maxSlides: 30,
    maxOrganizations: -1, // unlimited
    formats: ["PPTX", "PDF", "DOCX"] as const,
    collaboration: true,
    watermark: false,
    whiteLabel: false,
    apiAccess: false,
    prioritySupport: false,
    customDomain: false,
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID!,
  },
  AGENCY: {
    name: "Agency",
    price: -1, // Custom pricing - contact sales
    reportsPerMonth: -1, // unlimited
    maxSlides: -1, // unlimited
    maxOrganizations: -1, // unlimited
    formats: ["PPTX", "PDF", "DOCX"] as const,
    collaboration: true,
    watermark: false,
    whiteLabel: true, // Full white-label
    apiAccess: true, // API keys for programmatic access
    prioritySupport: true, // Dedicated support
    customDomain: true, // Custom domain support
    stripePriceId: null, // Custom billing
  },
} as const

export type PlanType = keyof typeof PLANS

/**
 * Check if a plan has access to a specific feature
 */
export function planHasFeature(plan: PlanType, feature: keyof typeof PLANS.FREE): boolean {
  const planConfig = PLANS[plan]
  return Boolean(planConfig[feature])
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