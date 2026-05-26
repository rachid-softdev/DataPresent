// ==========================================
// GET /api/admin/overrides
// POST /api/admin/overrides
// DELETE /api/admin/overrides/:id
// Admin only
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { entitlementRepository } from '@/lib/entitlements/repository'
import { invalidateCache } from '@/lib/entitlements/feature-gate'
import { prisma } from '@/lib/prisma'
import type { OverrideScope, Prisma } from '@prisma/client'

// GET all overrides
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
    const scope = searchParams.get('scope') // 'USER' or 'ORG'
    const scopeId = searchParams.get('scopeId')

    const skip = (page - 1) * limit

    const where: Prisma.EntitlementOverrideWhereInput = {}

    if (scope) {
      if (!['USER', 'ORG'].includes(scope)) {
        return NextResponse.json({ error: 'Invalid scope filter' }, { status: 400 })
      }
      where.scope = scope as OverrideScope
    }

    if (scopeId) {
      if (typeof scopeId !== 'string' || scopeId.length > 255) {
        return NextResponse.json({ error: 'Invalid scopeId' }, { status: 400 })
      }
      where.scopeId = scopeId
    }

    const [overrides, total] = await Promise.all([
      prisma.entitlementOverride.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.entitlementOverride.count({ where }),
    ])

    return NextResponse.json({
      data: overrides,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('[admin/overrides] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create an override
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
    const { scope, scopeId, featureKey, enabled, limitValue, expiresAt, reason } = body

    // Validate required fields
    if (!scope || !scopeId || !featureKey || reason === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: scope, scopeId, featureKey, reason' },
        { status: 400 }
      )
    }

    if (!['USER', 'ORG'].includes(scope)) {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 })
    }

    // Verify feature exists
    const feature = await prisma.feature.findUnique({ where: { key: featureKey } })
    if (!feature) {
      return NextResponse.json({ error: 'Feature not found' }, { status: 404 })
    }

    // Create override
    const override = await entitlementRepository.createOverride({
      scope: scope as OverrideScope,
      scopeId,
      featureKey,
      enabled: enabled ?? true,
      limitValue: limitValue ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      reason,
      createdById: session.user.id,
    })

    // Invalidate cache for the org (if org override) or user
    if (scope === 'ORG') {
      await invalidateCache(scopeId)
    }

    return NextResponse.json(override, { status: 201 })
  } catch (error) {
    console.error('[admin/overrides] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete an override
export async function DELETE(request: NextRequest) {
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

    // Extract override ID from URL
    const url = new URL(request.url)
    const id = url.pathname.split('/').slice(-1)[0]

    const override = await prisma.entitlementOverride.findUnique({
      where: { id },
      select: { scope: true, scopeId: true },
    })

    if (!override) {
      return NextResponse.json({ error: 'Override not found' }, { status: 404 })
    }

    await entitlementRepository.deleteOverride(id)

    // Invalidate cache
    if (override.scope === 'ORG') {
      await invalidateCache(override.scopeId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[admin/overrides] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
