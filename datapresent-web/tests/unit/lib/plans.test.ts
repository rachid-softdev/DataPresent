// ==========================================
// Plans Tests
// ==========================================

import { describe, it, expect, vi } from 'vitest'

// Mock prisma and feature-gate to avoid Prisma client dependency
vi.mock('@/lib/prisma', () => ({
  prisma: {},
}))

vi.mock('@/lib/entitlements/feature-gate', () => ({
  featureGateService: {
    hasFeature: vi.fn(),
    canConsume: vi.fn(),
    getAllEntitlements: vi.fn(),
  },
}))

describe('plans', () => {
  it('should export PLANS object', async () => {
    const { PLANS } = await import('@/lib/entitlements/compat')
    expect(PLANS).toBeDefined()
    expect(PLANS.FREE).toBeDefined()
    expect(PLANS.PRO).toBeDefined()
    expect(PLANS.TEAM).toBeDefined()
    expect(PLANS.AGENCY).toBeDefined()
  })

  it('should have correct FREE plan features', async () => {
    const { PLANS } = await import('@/lib/entitlements/compat')

    expect(PLANS.FREE.name).toBe('Free')
    expect(PLANS.FREE.price).toBe(0)
    expect(PLANS.FREE.reportsPerMonth).toBe(3)
    expect(PLANS.FREE.maxSlides).toBe(8)
    expect(PLANS.FREE.formatPPTX).toBe(true)
    expect(PLANS.FREE.formatPDF).toBe(false)
    expect(PLANS.FREE.formatDOCX).toBe(false)
    expect(PLANS.FREE.watermark).toBe(true)
    expect(PLANS.FREE.whiteLabel).toBe(false)
  })

  it('should have correct PRO plan features', async () => {
    const { PLANS } = await import('@/lib/entitlements/compat')

    expect(PLANS.PRO.name).toBe('Pro')
    expect(PLANS.PRO.price).toBe(19)
    expect(PLANS.PRO.reportsPerMonth).toBe(30)
    expect(PLANS.PRO.formatPPTX).toBe(true)
    expect(PLANS.PRO.formatPDF).toBe(true)
    expect(PLANS.PRO.formatDOCX).toBe(true)
    expect(PLANS.PRO.watermark).toBe(false)
  })

  it('should have correct TEAM plan features', async () => {
    const { PLANS } = await import('@/lib/entitlements/compat')

    expect(PLANS.TEAM.name).toBe('Team')
    expect(PLANS.TEAM.price).toBe(49)
    expect(PLANS.TEAM.reportsPerMonth).toBe(-1) // unlimited
    expect(PLANS.TEAM.maxOrganizations).toBe(-1) // unlimited
    expect(PLANS.TEAM.collaboration).toBe(true)
  })

  it('should have correct AGENCY plan features', async () => {
    const { PLANS } = await import('@/lib/entitlements/compat')

    expect(PLANS.AGENCY.name).toBe('Agency')
    expect(PLANS.AGENCY.price).toBe(-1) // custom
    expect(PLANS.AGENCY.whiteLabel).toBe(true)
    expect(PLANS.AGENCY.apiAccess).toBe(true)
    expect(PLANS.AGENCY.customDomain).toBe(true)
    expect(PLANS.AGENCY.prioritySupport).toBe(true)
  })

  it('should export planHasFeature function', async () => {
    const { planHasFeature } = await import('@/lib/entitlements/compat')
    expect(planHasFeature).toBeDefined()
  })

  it('should check plan features correctly', async () => {
    const { planHasFeature } = await import('@/lib/entitlements/compat')

    expect(planHasFeature('FREE', 'formatPPTX')).toBe(true)
    expect(planHasFeature('FREE', 'formatPDF')).toBe(false)
    expect(planHasFeature('PRO', 'formatPDF')).toBe(true)
    expect(planHasFeature('AGENCY', 'whiteLabel')).toBe(true)
  })

  it('should export getPlanPrice function', async () => {
    const { getPlanPrice } = await import('@/lib/entitlements/compat')
    expect(getPlanPrice).toBeDefined()
  })

  it('should return correct price strings', async () => {
    const { getPlanPrice } = await import('@/lib/entitlements/compat')

    expect(getPlanPrice('FREE')).toBe('€0/mo')
    expect(getPlanPrice('PRO')).toBe('€19/mo')
    expect(getPlanPrice('TEAM')).toBe('€49/mo')
    expect(getPlanPrice('AGENCY')).toBe('Custom')
  })

  it('should export planSupportsFormat function', async () => {
    const { planSupportsFormat } = await import('@/lib/entitlements/compat')
    expect(planSupportsFormat).toBeDefined()
  })

  it('should check format support correctly', async () => {
    const { planSupportsFormat } = await import('@/lib/entitlements/compat')

    expect(planSupportsFormat('FREE', 'PPTX')).toBe(true)
    expect(planSupportsFormat('FREE', 'PDF')).toBe(false)
    expect(planSupportsFormat('PRO', 'PDF')).toBe(true)
    expect(planSupportsFormat('PRO', 'DOCX')).toBe(true)
    expect(planSupportsFormat('AGENCY', 'PPTX')).toBe(true)
  })

  it('should export PLAN_FEATURES', async () => {
    const { PLAN_FEATURES } = await import('@/lib/entitlements/compat')
    expect(PLAN_FEATURES).toBeDefined()
    expect(PLAN_FEATURES.reports).toBeDefined()
    expect(PLAN_FEATURES.exports).toBeDefined()
  })
})
