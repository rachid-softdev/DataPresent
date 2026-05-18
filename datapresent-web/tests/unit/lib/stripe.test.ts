// ==========================================
// Stripe Tests
// ==========================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('stripe', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = process.env
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should export stripe instance', async () => {
    const module = await import('@/lib/stripe')
    expect(module.stripe).toBeDefined()
  })

  it('should export getStripe function', async () => {
    const module = await import('@/lib/stripe')
    expect(module.getStripe).toBeDefined()
  })

  it('should return null when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY

    // Re-import with cleared env
    const { stripe } = await import('@/lib/stripe')
    expect(stripe).toBe(null)
  })

  it('should throw error when getStripe called without config', async () => {
    delete process.env.STRIPE_SECRET_KEY

    const { getStripe } = await import('@/lib/stripe')
    expect(() => getStripe()).toThrow('Stripe is not configured')
  })
})
