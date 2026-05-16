import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkRateLimit, DEFAULT_LIMIT, DEFAULT_WINDOW } from '@/lib/rate-limit'

// Mock prisma
const mockPrisma = {
  rateLimit: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('rate-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DEFAULT_LIMIT', () => {
    it('should have reasonable defaults based on environment', () => {
      // In test environment, DEFAULT_LIMIT should be 100 (dev mode)
      expect(DEFAULT_LIMIT).toBe(100)
      expect(DEFAULT_WINDOW).toBe(60000) // 1 minute for dev
    })
  })

  describe('checkRateLimit', () => {
    it('should allow first request when no record exists', async () => {
      mockPrisma.rateLimit.findUnique.mockResolvedValue(null)
      mockPrisma.rateLimit.create.mockResolvedValue({})

      const result = await checkRateLimit('test-key')

      expect(result).toBe(true)
      expect(mockPrisma.rateLimit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'test-key',
          count: 1,
        }),
      })
    })

    it('should allow request when under limit', async () => {
      mockPrisma.rateLimit.findUnique.mockResolvedValue({
        key: 'test-key',
        count: 5,
        windowStart: new Date(),
        expires: new Date(Date.now() + 60000),
      })
      mockPrisma.rateLimit.update.mockResolvedValue({})

      const result = await checkRateLimit('test-key', { limit: 10 })

      expect(result).toBe(true)
      expect(mockPrisma.rateLimit.update).toHaveBeenCalledWith({
        where: { key: 'test-key' },
        data: expect.objectContaining({
          count: 6,
        }),
      })
    })

    it('should deny request when at limit', async () => {
      mockPrisma.rateLimit.findUnique.mockResolvedValue({
        key: 'test-key',
        count: 10,
        windowStart: new Date(),
        expires: new Date(Date.now() + 60000),
      })

      const result = await checkRateLimit('test-key', { limit: 10 })

      expect(result).toBe(false)
      expect(mockPrisma.rateLimit.update).not.toHaveBeenCalled()
    })

    it('should reset window when expired', async () => {
      const oldWindowStart = new Date(Date.now() - 120000) // 2 minutes ago

      mockPrisma.rateLimit.findUnique.mockResolvedValue({
        key: 'test-key',
        count: 10,
        windowStart: oldWindowStart,
        expires: oldWindowStart,
      })
      mockPrisma.rateLimit.update.mockResolvedValue({})

      const result = await checkRateLimit('test-key', { limit: 10, windowMs: 60000 })

      expect(result).toBe(true)
      expect(mockPrisma.rateLimit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'test-key' },
          data: expect.objectContaining({
            count: 1, // Reset to 1
          }),
        })
      )
    })

    it('should use custom limit when provided', async () => {
      mockPrisma.rateLimit.findUnique.mockResolvedValue(null)
      mockPrisma.rateLimit.create.mockResolvedValue({})

      await checkRateLimit('test-key', { limit: 5 })

      // First request should always be allowed
      expect(mockPrisma.rateLimit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          key: 'test-key',
          count: 1,
        }),
      })
    })
  })
})