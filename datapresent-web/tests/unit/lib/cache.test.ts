// ==========================================
// Cache Tests
// ==========================================

import { describe, it, expect, vi } from 'vitest'

// Mock modules that cache.ts depends on
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

// Mock the unstable_cache and revalidateTag
const mockRevalidateTag = vi.fn()
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn, key, options) => fn),
  revalidateTag: mockRevalidateTag,
}))

describe('cache', () => {
  it('should export CACHE_TAGS', async () => {
    const { CACHE_TAGS } = await import('@/lib/cache')
    expect(CACHE_TAGS).toBeDefined()
    expect(typeof CACHE_TAGS.ORG).toBe('function')
    expect(CACHE_TAGS.ORG('123')).toBe('org-123')
    expect(CACHE_TAGS.PLANS).toBe('plans')
    expect(typeof CACHE_TAGS.USER).toBe('function')
    expect(CACHE_TAGS.USER('123')).toBe('user-123')
    expect(typeof CACHE_TAGS.REPORT).toBe('function')
    expect(CACHE_TAGS.REPORT('123')).toBe('report-123')
  })

  it('should export cache config', async () => {
    const module = await import('@/lib/cache')
    expect(module).toBeDefined()
  })

  it('should export invalidateOrgCache function', async () => {
    const { invalidateOrgCache } = await import('@/lib/cache')
    expect(invalidateOrgCache).toBeDefined()
  })

  it('should call revalidateTag for org invalidation', async () => {
    const { invalidateOrgCache } = await import('@/lib/cache')

    await invalidateOrgCache('org-123')

    expect(mockRevalidateTag).toHaveBeenCalled()
  })

  it('should export invalidateUserCache function', async () => {
    const { invalidateUserCache } = await import('@/lib/cache')
    expect(invalidateUserCache).toBeDefined()
  })

  it('should call revalidateTag for user invalidation', async () => {
    const { invalidateUserCache } = await import('@/lib/cache')

    await invalidateUserCache('user-123')

    expect(mockRevalidateTag).toHaveBeenCalled()
  })

  it('should export invalidateReportCache function', async () => {
    const { invalidateReportCache } = await import('@/lib/cache')
    expect(invalidateReportCache).toBeDefined()
  })

  it('should call revalidateTag for report invalidation', async () => {
    const { invalidateReportCache } = await import('@/lib/cache')

    await invalidateReportCache('report-123')

    expect(mockRevalidateTag).toHaveBeenCalled()
  })

  it('should export shouldCache function', async () => {
    const { shouldCache } = await import('@/lib/cache')
    expect(shouldCache).toBeDefined()
  })

  it('should correctly determine cache eligibility', async () => {
    const { shouldCache } = await import('@/lib/cache')

    expect(shouldCache({ key: 'value' })).toBe(true)
    expect(shouldCache('string')).toBe(true)
    expect(shouldCache(123)).toBe(true)
    expect(shouldCache(null)).toBe(false)
    expect(shouldCache(undefined)).toBe(false)
  })

  it('should export cacheOptions function', async () => {
    const { cacheOptions } = await import('@/lib/cache')
    expect(cacheOptions).toBeDefined()
  })

  it('should return cache options object', async () => {
    const { cacheOptions } = await import('@/lib/cache')

    const options = cacheOptions(300)
    expect(options).toEqual({ revalidate: 300 })
  })
})
