import { prisma } from '@/lib/prisma'
import { PLANS, PlanType } from './plans'

export async function getUserPlan(userId: string): Promise<{
  plan: PlanType
  orgId: string
  planConfig: typeof PLANS[PlanType]
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      membership: {
        include: {
          org: {
            include: { subscription: true }
          }
        }
      }
    }
  })

  const membership = user?.membership[0]
  if (!membership) {
    return {
      plan: 'FREE',
      orgId: '',
      planConfig: PLANS.FREE
    }
  }

  const plan = membership.org.subscription?.plan || 'FREE'
  return {
    plan: plan as PlanType,
    orgId: membership.orgId,
    planConfig: PLANS[plan as PlanType]
  }
}

export async function canCreateReport(userId: string): Promise<{
  allowed: boolean
  reason?: string
  upgrade?: boolean
}> {
  const { plan, orgId, planConfig } = await getUserPlan(userId)

  if (planConfig.reportsPerMonth === -1) {
    return { allowed: true }
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const count = await prisma.report.count({
    where: {
      orgId,
      createdAt: { gte: startOfMonth },
    },
  })

  if (count >= planConfig.reportsPerMonth) {
    return {
      allowed: false,
      reason: `Limite de ${planConfig.reportsPerMonth} rapports/mois atteinte sur le plan ${PLANS[plan].name}.`,
      upgrade: true
    }
  }

  return { allowed: true }
}

export function canUseFormat(plan: PlanType, format: string): boolean {
  return PLANS[plan].formats.includes(format as any)
}

export function canHaveSlideCount(plan: PlanType, slideCount: number): {
  allowed: boolean
  maxSlides: number
} {
  const maxSlides = PLANS[plan].maxSlides
  return {
    allowed: slideCount <= maxSlides,
    maxSlides
  }
}

export async function getRemainingReports(userId: string): Promise<{
  remaining: number
  total: number
  resetDate: Date
}> {
  const { orgId, planConfig } = await getUserPlan(userId)

  if (planConfig.reportsPerMonth === -1) {
    return { remaining: -1, total: -1, resetDate: new Date() }
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const count = await prisma.report.count({
    where: {
      orgId,
      createdAt: { gte: startOfMonth },
    },
  })

  return {
    remaining: Math.max(0, planConfig.reportsPerMonth - count),
    total: planConfig.reportsPerMonth,
    resetDate: startOfMonth
  }
}