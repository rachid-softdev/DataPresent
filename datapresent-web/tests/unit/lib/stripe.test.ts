// ==========================================
// Stripe Tests
// ==========================================

import { describe, it, expect } from 'vitest'

describe('stripe', () => {
  it('should export getStripe function (named export only, no stripe instance)', async () => {
    const mod = await import('@/lib/stripe')
    expect(mod.getStripe).toBeDefined()
    expect(mod.stripe).toBeUndefined()
  })

  it('should throw when getStripe called without STRIPE_SECRET_KEY', async () => {
    const { getStripe } = await import('@/lib/stripe')
    // STRIPE_SECRET_KEY is not set in test env → isFeatureEnabled('stripe') returns false
    expect(() => getStripe()).toThrow('Stripe is not configured')
  })
})
