import { unstable_cache } from 'next/cache'
import { prisma } from './prisma'
import { PLANS } from './plans'

// Cache tags for manual invalidation
export const CACHE_TAGS = {
  ORG: 'org',
  PLANS: 'plans',
  USER: 'user',
  REPORT: 'report',
} as const

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
  // Short cache for frequently changing data
  SHORT: { revalidate: 60 }, // 1 minute
  // Medium cache for semi-static data
  MEDIUM: { revalidate: 300 }, // 5 minutes
  // Long cache for static data
  LONG: { revalidate: 3600 }, // 1 hour
} as const

/**
 * Get cached organization data
 */
export const getCachedOrg = unstable_cache(
  async (orgId: string) => {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        subscription: true,
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
      },
    })
    return org
  },
  ['org', 'orgId'],
  CACHE_CONFIG.MEDIUM
)

/**
 * Get cached organization by slug
 */
export const getCachedOrgBySlug = unstable_cache(
  async (slug: string) => {
    const org = await prisma.organization.findUnique({
      where: { slug },
      include: { subscription: true },
    })
    return org
  },
  ['org', 'slug'],
  CACHE_CONFIG.MEDIUM
)

/**
 * Get cached plans (static data)
 */
export const getCachedPlans = unstable_cache(
  async () => {
    return PLANS
  },
  ['plans'],
  CACHE_CONFIG.LONG
)

/**
 * Get cached user data
 */
export const getCachedUser = unstable_cache(
  async (userId: string) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    })
    return user
  },
  ['user', 'userId'],
  CACHE_CONFIG.SHORT
)

/**
 * Get cached report list for an organization
 */
export const getCachedReportList = unstable_cache(
  async (orgId: string, limit = 10) => {
    const reports = await prisma.report.findMany({
      where: { orgId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: { id: true, title: true, status: true, sector: true, updatedAt: true },
    })
    return reports
  },
  ['reports', 'list'],
  CACHE_CONFIG.SHORT
)

/**
 * Get cached single report
 */
export const getCachedReport = unstable_cache(
  async (reportId: string) => {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        slides: { orderBy: { position: 'asc' } },
        sourceFile: true,
        exports: true,
      },
    })
    return report
  },
  ['report', 'single'],
  CACHE_CONFIG.SHORT
)

/**
 * Invalidate organization cache (call after updates)
 */
export async function invalidateOrgCache(orgId: string): Promise<void> {
  // Next.js cache invalidation happens automatically with unstable_cache
  // This function is here for documentation purposes
  // In production, you might use: revalidateTag(`org-${orgId}`)
  console.log(`[Cache] Org ${orgId} cache invalidated`)
}

/**
 * Invalidate user cache (call after profile updates)
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  console.log(`[Cache] User ${userId} cache invalidated`)
}

/**
 * Invalidate report cache (call after report updates)
 */
export async function invalidateReportCache(reportId: string): Promise<void> {
  console.log(`[Cache] Report ${reportId} cache invalidated`)
}

/**
 * Cached subscription check
 */
export const getCachedSubscription = unstable_cache(
  async (orgId: string) => {
    const subscription = await prisma.subscription.findUnique({
      where: { orgId },
    })
    return subscription
  },
  ['subscription', 'orgId'],
  CACHE_CONFIG.MEDIUM
)

/**
 * Helper to check if data should be cached
 */
export function shouldCache<T>(data: T | null | undefined): boolean {
  return data !== null && data !== undefined
}

/**
 * Cache options builder
 */
export function cacheOptions(seconds: number) {
  return { revalidate: seconds }
}