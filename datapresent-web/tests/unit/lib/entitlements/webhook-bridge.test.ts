// ==========================================
// Webhook Bridge — Entitlements Export Tests
// ==========================================
//
// Tests that the webhook-bridge (or its replacement) correctly exports
// Stripe webhook handler functions without creating a circular dependency
// between entitlements/module and stripe-webhook-handler.
//
// Covers REVIEW issue: Back-end Agent 1 / Dépendance circulaire potentielle.
// Current issue: entitements/index.ts re-exports from '../stripe-webhook-handler',
// creating a circular dependency path:
//   entitlements/index → stripe-webhook-handler → entitlements/repository
//
// The fix extracts webhook-related re-exports into a dedicated bridge module
// to break the cycle.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock env — needed for stripe-webhook-handler import
// ---------------------------------------------------------------------------
vi.mock('@/env', () => ({
  env: {
    NODE_ENV: 'test',
    STRIPE_SECRET_KEY: 'sk_test_mock',
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    STRIPE_PRICE_PRO_MONTHLY: 'price_pro_test',
    STRIPE_PRICE_TEAM_MONTHLY: 'price_team_test',
    STRIPE_PRICE_STARTER_MONTHLY: 'price_starter_test',
  },
}))

// ---------------------------------------------------------------------------
// Mock Stripe
// ---------------------------------------------------------------------------
vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: {
      constructEvent: vi.fn(),
    },
  }),
}))

// ---------------------------------------------------------------------------
// Mock dependencies needed for stripe-webhook-handler
// ---------------------------------------------------------------------------
vi.mock('@/lib/entitlements/repository', () => ({
  entitlementRepository: {
    isEventProcessed: vi.fn().mockResolvedValue(false),
    markEventProcessed: vi.fn().mockResolvedValue(undefined),
    updateSubscription: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/entitlements/feature-gate', () => ({
  invalidateCache: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    webhookEvent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock next/server and next-auth to prevent module resolution errors in tests
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown) => new Response(JSON.stringify(body))),
  },
  NextRequest: vi.fn(),
}))

vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}))

vi.mock('next-auth/providers/credentials', () => ({
  default: vi.fn(),
}))

vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(),
}))

vi.mock('@auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(),
}))

vi.mock('@/lib/email-normalize', () => ({
  normalizeEmail: vi.fn((email: string) => email),
}))

vi.mock('@/lib/crypto', () => ({
  verifyToken: vi.fn(),
  extractTokenPrefix: vi.fn(),
}))

vi.mock('@/lib/password', () => ({
  verifyPassword: vi.fn(),
}))

describe('webhook-bridge — entitlements webhook exports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // The webhook bridge module should exist and export the key functions
  // -----------------------------------------------------------------------
  it('should export handleWebhookEvent from the webhook bridge module', async () => {
    // This module should exist as a thin re-export layer
    const mod = await import('@/lib/entitlements/webhook-bridge')
    expect(mod.handleWebhookEvent).toBeDefined()
    expect(typeof mod.handleWebhookEvent).toBe('function')
  })

  it('should export constructWebhookEvent from the webhook bridge module', async () => {
    const mod = await import('@/lib/entitlements/webhook-bridge')
    expect(mod.constructWebhookEvent).toBeDefined()
    expect(typeof mod.constructWebhookEvent).toBe('function')
  })

  it('should export isEventProcessed from the webhook bridge module', async () => {
    const mod = await import('@/lib/entitlements/webhook-bridge')
    expect(mod.isEventProcessed).toBeDefined()
    expect(typeof mod.isEventProcessed).toBe('function')
  })

  it('should export markEventProcessed from the webhook bridge module', async () => {
    const mod = await import('@/lib/entitlements/webhook-bridge')
    expect(mod.markEventProcessed).toBeDefined()
    expect(typeof mod.markEventProcessed).toBe('function')
  })

  // -----------------------------------------------------------------------
  // Verify the bridge is re-exporting from the correct source
  // -----------------------------------------------------------------------
  it('should delegate handleWebhookEvent to the stripe-webhook-handler implementation', async () => {
    const bridge = await import('@/lib/entitlements/webhook-bridge')
    const handler = await import('@/lib/stripe-webhook-handler')

    // Both should reference the same function (the handler)
    expect(bridge.handleWebhookEvent).toBe(handler.handleWebhookEvent)
  })

  // -----------------------------------------------------------------------
  // handleWebhookEvent should be callable through the bridge
  // -----------------------------------------------------------------------
  it('should call handleWebhookEvent through the bridge without error', async () => {
    const { handleWebhookEvent } = await import('@/lib/entitlements/webhook-bridge')

    // Create a minimal Stripe event
    const event = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: { object: {} },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal Stripe event mock
    } as any

    const result = await handleWebhookEvent(event)

    expect(result).toBeDefined()
    expect(result.success).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // Verify the bridge also exports utility functions
  // -----------------------------------------------------------------------
  it('should export verifyWebhookSignature and parseWebhookBody', async () => {
    const mod = await import('@/lib/entitlements/webhook-bridge')
    expect(mod.verifyWebhookSignature).toBeDefined()
    expect(mod.parseWebhookBody).toBeDefined()
  })

  // -----------------------------------------------------------------------
  // Idempotency functions should work through the bridge
  // -----------------------------------------------------------------------
  it('should delegate isEventProcessed to repository through the bridge', async () => {
    const { isEventProcessed } = await import('@/lib/entitlements/webhook-bridge')
    const { entitlementRepository } = await import('@/lib/entitlements/repository')

    vi.mocked(entitlementRepository.isEventProcessed).mockResolvedValue(true)

    const result = await isEventProcessed('evt_123')

    expect(result).toBe(true)
    expect(entitlementRepository.isEventProcessed).toHaveBeenCalledWith('evt_123')
  })
})
