// ==========================================
// Entitlements Repository Tests
// ==========================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('entitlements repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export entitlementRepository', async () => {
    const { entitlementRepository } = await import('@/lib/entitlements/repository')
    expect(entitlementRepository).toBeDefined()
  })

  it('should export repository methods', async () => {
    const { entitlementRepository } = await import('@/lib/entitlements/repository')
    // Check that it has the expected methods
    expect(entitlementRepository.getActiveSubscription).toBeDefined()
    expect(entitlementRepository.getPlanFeatures).toBeDefined()
    expect(entitlementRepository.getAllPlanFeatures).toBeDefined()
    expect(entitlementRepository.getUsage).toBeDefined()
    expect(entitlementRepository.consumeUsage).toBeDefined()
  })
})
