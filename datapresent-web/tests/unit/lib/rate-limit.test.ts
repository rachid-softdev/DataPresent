import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit, DEFAULT_LIMIT, DEFAULT_WINDOW } from '@/lib/rate-limit'

const { mockFindUnique, mockCreate, mockUpdate } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    rateLimit: {
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
    },
  },
}))

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
  })

  describe('checkRateLimit', () => {
    it('should allow first request when no record exists', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({})

      const result = await checkRateLimit('test-key')

      expect(result).toBe(true)
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'test-key',
          count: 1,
        }),
      })
    })

    it('should allow request when under limit', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'test-key',
        count: 5,
        windowStart: new Date(),
        expires: new Date(Date.now() + 60000),
      })
      mockUpdate.mockResolvedValue({})

      const result = await checkRateLimit('test-key', { limit: 10 })

      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { key: 'test-key' },
        data: expect.objectContaining({
          count: 6,
        }),
      })
    })

    it('should deny request when at limit', async () => {
      mockFindUnique.mockResolvedValue({
        key: 'test-key',
        count: 10,
        windowStart: new Date(),
        expires: new Date(Date.now() + 60000),
      })

      const result = await checkRateLimit('test-key', { limit: 10 })

      expect(result).toBe(false)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('should reset window when expired', async () => {
      const oldWindowStart = new Date(Date.now() - 120000) // 2 minutes ago

      mockFindUnique.mockResolvedValue({
        key: 'test-key',
        count: 10,
        windowStart: oldWindowStart,
        expires: oldWindowStart,
      })
      mockUpdate.mockResolvedValue({})

      const result = await checkRateLimit('test-key', { limit: 10, windowMs: 60000 })

      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'test-key' },
          data: expect.objectContaining({
            count: 1, // Reset to 1
          }),
        })
      )
    })

    it('should use custom limit when provided', async () => {
      mockFindUnique.mockResolvedValue(null)
      mockCreate.mockResolvedValue({})

      await checkRateLimit('test-key', { limit: 5 })

      // First request should always be allowed
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'test-key',
          count: 1,
        }),
      })
    })
  })
})
