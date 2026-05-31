import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQueryRaw = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: mockQueryRaw },
}))

import { checkRateLimit, DEFAULT_LIMIT, DEFAULT_WINDOW } from '@/lib/rate-limit'

describe('rate-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DEFAULT_LIMIT', () => {
    it('should have reasonable defaults based on environment', () => {
      // In test environment, DEFAULT_LIMIT should be 30 (production mode)
      expect(DEFAULT_LIMIT).toBe(30)
      expect(DEFAULT_WINDOW).toBe(3600000) // 1 hour for production
    })

    it('should have a valid default limit (positive number)', () => {
      expect(DEFAULT_LIMIT).toBeGreaterThan(0)
    })

    it('should have a valid default window (positive number)', () => {
      expect(DEFAULT_WINDOW).toBeGreaterThan(0)
    })

    it('should have reasonable default limit (<= 1000)', () => {
      expect(DEFAULT_LIMIT).toBeLessThanOrEqual(1000)
    })

    it('should have reasonable default window (<= 1 day in ms)', () => {
      expect(DEFAULT_WINDOW).toBeLessThanOrEqual(86400000)
    })
  })

  describe('checkRateLimit', () => {
    it('should allow first request when no record exists', async () => {
      // First INSERT succeeds → allowed = true
      mockQueryRaw.mockResolvedValue([{ allowed: true }])

      const result = await checkRateLimit('test-key')

      expect(result).toBe(true)
      expect(mockQueryRaw).toHaveBeenCalledOnce()
    })

    it('should allow request when under limit', async () => {
      mockQueryRaw.mockResolvedValue([{ allowed: true }])

      const result = await checkRateLimit('test-key', { limit: 10 })

      expect(result).toBe(true)
    })

    it('should deny request when at limit', async () => {
      mockQueryRaw.mockResolvedValue([{ allowed: false }])

      const result = await checkRateLimit('test-key', { limit: 10 })

      expect(result).toBe(false)
    })

    it('should default to allowed=true when result set is empty', async () => {
      // Edge case: empty result from query
      mockQueryRaw.mockResolvedValue([])

      const result = await checkRateLimit('test-key')

      expect(result).toBe(true)
    })

    it('should use custom limit when provided', async () => {
      mockQueryRaw.mockResolvedValue([{ allowed: true }])

      await checkRateLimit('test-key', { limit: 5 })

      // Verify $queryRaw was called (SQL template)
      expect(mockQueryRaw).toHaveBeenCalledOnce()
    })

    it('should use SQL interval multiplication (not string concat) for intervalMs', async () => {
      // Regression test for M5: ensure SQL uses ::double precision * interval
      // instead of string concatenation which was vulnerable to SQL injection
      mockQueryRaw.mockResolvedValue([{ allowed: true }])

      await checkRateLimit('sql-injection-test')

      // Extract the SQL query from the first argument of the raw query
      const callArgs = mockQueryRaw.mock.calls[0]
      const sqlQuery = String(callArgs[0])

      // The query should use ::double precision * interval '1 millisecond'
      // This proves the fix replaced string concatenation with proper SQL
      expect(sqlQuery).toContain('::double precision * interval')
      expect(sqlQuery).not.toContain("' milliseconds'")  // old concat pattern
    })
  })
})
