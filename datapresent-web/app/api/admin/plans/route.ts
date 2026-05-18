// ==========================================
// GET /api/admin/plans
// POST /api/admin/plans/:planKey/features
// Admin only
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { entitlementRepository } from '@/lib/entitlements/repository'
import { prisma } from '@/lib/prisma'
import type { Plan, DowngradeStrategy } from '@prisma/client'

// GET all plans with their features
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const sort = searchParams.get('sort') ?? 'plan:asc'

    const plans: Plan[] = ['FREE', 'PRO', 'TEAM', 'AGENCY']
    const offset = (page - 1) * limit

    // Get all features
    const allFeatures = await prisma.feature.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    })

    // Build plan features map
    const result = await Promise.all(
      plans.slice(offset, offset + limit).map(async (plan) => {
        const planFeatures = await entitlementRepository.getPlanFeatures(plan)

        return {
          plan,
          features: allFeatures.map((f) => {
            const pf = planFeatures.find((p) => p.featureId === f.id)
            return {
              featureKey: f.key,
              enabled: pf?.enabled ?? false,
              limitValue: pf?.limitValue ?? null,
              configJson: pf?.configJson,
              downgradeStrategy: pf?.downgradeStrategy ?? 'GRACEFUL',
            }
          }),
        }
      })
    )

    return NextResponse.json({
      data: result,
      pagination: {
        page,
        limit,
        total: plans.length,
        totalPages: Math.ceil(plans.length / limit),
      },
    })
  } catch (error) {
    console.error('[admin/plans] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Add/update feature for a plan
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { planKey, featureKey, enabled, limitValue, configJson, downgradeStrategy } = body

    if (!planKey || !featureKey) {
      return NextResponse.json(
        { error: 'Missing required fields: planKey, featureKey' },
        { status: 400 }
      )
    }

    // Validate plan
    if (!['FREE', 'PRO', 'TEAM', 'AGENCY'].includes(planKey)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get feature
    const feature = await prisma.feature.findUnique({
      where: { key: featureKey },
    })

    if (!feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 })
    }

    // Upsert plan feature
    const planFeature = await prisma.planFeature.upsert({
      where: {
        plan_feature: {
          plan: planKey as Plan,
          featureId: feature.id,
        },
      },
      create: {
        plan: planKey as Plan,
        featureId: feature.id,
        enabled: enabled ?? false,
        limitValue: limitValue ?? null,
        configJson: configJson ?? null,
        downgradeStrategy: (downgradeStrategy as DowngradeStrategy) ?? 'GRACEFUL',
      },
      update: {
        enabled: enabled ?? undefined,
        limitValue: limitValue ?? undefined,
        configJson: configJson ?? undefined,
        downgradeStrategy: (downgradeStrategy as DowngradeStrategy) ?? undefined,
      },
    })

    return NextResponse.json(planFeature)
  } catch (error) {
    console.error('[admin/plans] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
