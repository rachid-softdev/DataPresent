import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./prisma";
import { PLANS } from "@/lib/entitlements/compat";

// Cache tags for manual invalidation
export const CACHE_TAGS = {
  ORG: (id: string) => `org-${id}`,
  PLANS: "plans",
  USER: (id: string) => `user-${id}`,
  REPORT: (id: string) => `report-${id}`,
} as const;

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
} as const;

/**
 * Get cached organization data
 */
export function getCachedOrg(orgId: string) {
  return unstable_cache(
    async () => {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          subscription: true,
          members: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } },
          },
        },
      });
      return org;
    },
    ["org", orgId],
    { ...CACHE_CONFIG.MEDIUM, tags: [CACHE_TAGS.ORG(orgId)] },
  )();
}

/**
 * Get cached organization by slug
 */
export function getCachedOrgBySlug(slug: string) {
  return unstable_cache(
    async () => {
      const org = await prisma.organization.findUnique({
        where: { slug },
        include: { subscription: true },
      });
      return org;
    },
    ["org", slug],
    { ...CACHE_CONFIG.MEDIUM, tags: [CACHE_TAGS.ORG(slug)] },
  )();
}

/**
 * Get cached plans (static data)
 */
export const getCachedPlans = unstable_cache(
  async () => {
    return PLANS;
  },
  ["plans"],
  CACHE_CONFIG.LONG,
);

/**
 * Get cached user data
 */
export function getCachedUser(userId: string) {
  return unstable_cache(
    async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, image: true },
      });
      return user;
    },
    ["user", userId],
    { ...CACHE_CONFIG.SHORT, tags: [CACHE_TAGS.USER(userId)] },
  )();
}

/**
 * Get cached report list for an organization
 */
export function getCachedReportList(orgId: string, limit = 10) {
  return unstable_cache(
    async () => {
      const reports = await prisma.report.findMany({
        where: { orgId },
        orderBy: { updatedAt: "desc" },
        take: limit,
        select: { id: true, title: true, status: true, sector: true, updatedAt: true },
      });
      return reports;
    },
    ["reports", "list", orgId],
    { ...CACHE_CONFIG.SHORT, tags: [CACHE_TAGS.REPORT(orgId)] },
  )();
}

/**
 * Get cached single report
 */
export function getCachedReport(reportId: string) {
  return unstable_cache(
    async () => {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          slides: { orderBy: { position: "asc" } },
          sourceFile: true,
          exports: true,
        },
      });
      return report;
    },
    ["report", reportId],
    { ...CACHE_CONFIG.SHORT, tags: [CACHE_TAGS.REPORT(reportId)] },
  )();
}

/**
 * Invalidate organization cache (call after updates)
 */
export async function invalidateOrgCache(orgId: string): Promise<void> {
  revalidateTag(CACHE_TAGS.ORG(orgId), { expire: 0 });
}

/**
 * Invalidate user cache (call after profile updates)
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  revalidateTag(CACHE_TAGS.USER(userId), { expire: 0 });
}

/**
 * Invalidate report cache (call after report updates)
 */
export async function invalidateReportCache(reportId: string): Promise<void> {
  revalidateTag(CACHE_TAGS.REPORT(reportId), { expire: 0 });
}

/**
 * Cached subscription check
 */
export function getCachedSubscription(orgId: string) {
  return unstable_cache(
    async () => {
      const subscription = await prisma.subscription.findUnique({
        where: { orgId },
      });
      return subscription;
    },
    ["subscription", orgId],
    { ...CACHE_CONFIG.MEDIUM, tags: [CACHE_TAGS.ORG(orgId)] },
  )();
}

/**
 * Helper to check if data should be cached
 */
export function shouldCache<T>(data: T | null | undefined): boolean {
  return data !== null && data !== undefined;
}

/**
 * Cache options builder
 */
export function cacheOptions(seconds: number) {
  return { revalidate: seconds };
}
