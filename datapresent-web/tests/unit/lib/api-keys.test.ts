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

import { formatKeyForDisplay } from '@/lib/api-keys'

describe('api-keys', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
