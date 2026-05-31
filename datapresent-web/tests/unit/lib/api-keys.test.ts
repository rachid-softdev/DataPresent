// ==========================================
// API Keys Tests
// ==========================================

import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    apiKey: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/sentry', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}))

vi.mock('@/lib/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed_password'),
  verifyPassword: vi.fn().mockResolvedValue(true),
}))

import { createApiKey, formatKeyForDisplay } from '@/lib/api-keys'

describe('api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createApiKey / generateSecureKey', () => {
    it('should produce a key of the correct total length (67 = "dp_" + 64 chars)', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'Test', expiresAt: new Date() })

      const result = await createApiKey({ orgId: 'org-1', name: 'Test Key' })

      // Key should be dp_ + 64 random characters = 67 chars total
      expect(result.key.length).toBe(67)
    })

    it('should start with dp_ prefix', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'Test', expiresAt: new Date() })

      const result = await createApiKey({ orgId: 'org-1', name: 'Test Key' })

      expect(result.key.startsWith('dp_')).toBe(true)
    })

    it('should only contain valid characters (a-z, A-Z, 0-9) after dp_ prefix', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'Test', expiresAt: new Date() })

      const result = await createApiKey({ orgId: 'org-1', name: 'Test Key' })

      const randomPart = result.key.slice(3) // after 'dp_'
      expect(randomPart).toMatch(/^[a-zA-Z0-9]+$/)
    })

    it('should produce 64 random characters after dp_ prefix', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'Test', expiresAt: new Date() })

      const result = await createApiKey({ orgId: 'org-1', name: 'Test Key' })

      const randomPart = result.key.slice(3)
      expect(randomPart.length).toBe(64)
    })

    it('should produce different keys on each call', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'Test', expiresAt: new Date() })

      const result1 = await createApiKey({ orgId: 'org-1', name: 'Key 1' })
      const result2 = await createApiKey({ orgId: 'org-1', name: 'Key 2' })

      expect(result1.key).not.toBe(result2.key)
    })

    it('should have sufficient entropy (unique across 1000 generated keys)', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'Test', expiresAt: new Date() })

      const keys = new Set<string>()
      for (let i = 0; i < 1000; i++) {
        const result = await createApiKey({ orgId: 'org-1', name: `Key ${i}` })
        keys.add(result.key)
      }

      // All 1000 keys should be unique
      expect(keys.size).toBe(1000)
    })

    it('should not have modulo bias (statistical distribution over 10000 keys)', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'Test', expiresAt: new Date() })

      // Count character frequency across many generated keys
      const charCounts: Record<string, number> = {}
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

      for (let i = 0; i < 10000; i++) {
        const result = await createApiKey({ orgId: 'org-1', name: `Key ${i}` })
        const randomPart = result.key.slice(3) // after 'dp_'
        for (const ch of randomPart) {
          charCounts[ch] = (charCounts[ch] || 0) + 1
        }
      }

      // Each character should appear roughly equally.
      // Total chars: 10000 keys × 64 chars = 640,000
      // Expected frequency per char (out of 62 chars): 640000 / 62 ≈ 10322
      //
      // The current modulo bias (chars.length=62, 256 % 62 = 8) means chars[0..7]
      // have probability 4/256 while chars[8..61] have 3/256. This causes the first
      // 8 characters to appear ~33% more often than the rest.
      //
      // After the fix (using crypto.randomInt(chars.length) instead of %),
      // the distribution should be near-uniform with max/min ratio close to 1.
      // With 640k unbiased trials, standard deviation per char is ~100,
      // so max/min should be well under 1.10.
      const counts = Object.values(charCounts)
      const minCount = Math.min(...counts)
      const maxCount = Math.max(...counts)

      const ratio = maxCount / minCount
      // If this test FAILS (ratio >= 1.10), modulo bias is likely present.
      // The fix is to replace `% chars.length` with `crypto.randomInt(chars.length)`.
      expect(ratio).toBeLessThan(1.10)

      // Sanity check: all 62 chars should appear
      expect(Object.keys(charCounts).length).toBe(62)
    })

    it('should return apiKey metadata from createApiKey', async () => {
      const now = new Date()
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'My Key', expiresAt: now })

      const result = await createApiKey({ orgId: 'org-1', name: 'My Key' })

      expect(result.apiKey.id).toBe('key-1')
      expect(result.apiKey.name).toBe('My Key')
      expect(result.apiKey.expiresAt).toBe(now)
    })

    it('should create prisma record with hashed key and prefix', async () => {
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'key-1', name: 'Test', expiresAt: new Date() })

      await createApiKey({ orgId: 'org-1', name: 'Test' })

      // Verify it was called with the right fields
      expect(mockPrisma.apiKey.create).toHaveBeenCalledOnce()
      const callArgs = mockPrisma.apiKey.create.mock.calls[0][0]
      expect(callArgs.data.orgId).toBe('org-1')
      expect(callArgs.data.name).toBe('Test')
      expect(callArgs.data.keyHash).toBeDefined()
      expect(callArgs.data.keyPrefix).toBeDefined()
      // keyPrefix should be first 12 chars of raw key
      expect(callArgs.data.keyPrefix.length).toBe(12)
    })
  })

  describe('formatKeyForDisplay', () => {
    it('should return full key if shorter than 12 chars', () => {
      expect(formatKeyForDisplay('short_key')).toBe('short_key')
    })

    it('should return full key if exactly 12 chars', () => {
      expect(formatKeyForDisplay('123456789012')).toBe('123456789012')
    })

    it('should truncate long keys', () => {
      const longKey = 'dp_abcdefghijklmnopqrstuvwxyz12345678901234567890'
      const result = formatKeyForDisplay(longKey)
      // Should be shorter than original
      expect(result.length).toBeLessThan(longKey.length)
      // Should contain the prefix
      expect(result.startsWith('dp_')).toBe(true)
      // Should contain ellipsis
      expect(result).toContain('...')
    })

    it('should show first 8 and last 4 characters', () => {
      const key = 'dp_12345678901234567890123456789012345678901234'
      const result = formatKeyForDisplay(key)
      expect(result).toMatch(/^dp_1234.*1234$/)
    })

    it('should handle keys with dp_ prefix', () => {
      const key = 'dp_abcdefghijklmnopqrstuvwxyz'
      const result = formatKeyForDisplay(key)
      expect(result.startsWith('dp_')).toBe(true)
    })
  })
})
