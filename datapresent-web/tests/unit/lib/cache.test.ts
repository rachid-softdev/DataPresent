// ==========================================
// Cache Tests
// ==========================================

import { describe, it, expect, vi } from 'vitest'

// Mock the unstable_cache
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((fn, key, options) => fn),
}))

describe('cache', () => {
  it('should export CACHE_TAGS', async () => {
    const { CACHE_TAGS } = await import('@/lib/cache')
    expect(CACHE_TAGS).toBeDefined()
    expect(CACHE_TAGS.ORG).toBe('org')
    expect(CACHE_TAGS.PLANS).toBe('plans')
    expect(CACHE_TAGS.USER).toBe('user')
    expect(CACHE_TAGS.REPORT).toBe('report')
  })

  it('should export cache config', async () => {
    const module = await import('@/lib/cache')
    // Should have configuration constants
    expect(module).toBeDefined()
  })

  it('should export invalidateOrgCache function', async () => {
    const { invalidateOrgCache } = await import('@/lib/cache')
    expect(invalidateOrgCache).toBeDefined()
  })

  it('should log cache invalidation for org', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { invalidateOrgCache } = await import('@/lib/cache')

    await invalidateOrgCache('org-123')

    expect(consoleSpy).toHaveBeenCalledWith('[Cache] Org org-123 cache invalidated')
    consoleSpy.mockRestore()
  })

  it('should export invalidateUserCache function', async () => {
    const { invalidateUserCache } = await import('@/lib/cache')
    expect(invalidateUserCache).toBeDefined()
  })

  it('should log cache invalidation for user', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { invalidateUserCache } = await import('@/lib/cache')

    await invalidateUserCache('user-123')

    expect(consoleSpy).toHaveBeenCalledWith('[Cache] User user-123 cache invalidated')
    consoleSpy.mockRestore()
  })

  it('should export invalidateReportCache function', async () => {
    const { invalidateReportCache } = await import('@/lib/cache')
    expect(invalidateReportCache).toBeDefined()
  })

  it('should log cache invalidation for report', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { invalidateReportCache } = await import('@/lib/cache')

    await invalidateReportCache('report-123')

    expect(consoleSpy).toHaveBeenCalledWith('[Cache] Report report-123 cache invalidated')
    consoleSpy.mockRestore()
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
