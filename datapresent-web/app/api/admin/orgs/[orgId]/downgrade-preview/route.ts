// ==========================================
// GET /api/admin/orgs/:orgId/downgrade-preview
// Preview which features will be affected by downgrade (admin only)
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDowngradePreview, getDowngradeInfo } from '@/lib/entitlements'
import { prisma } from '@/lib/prisma'
import type { Plan } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
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

    const { orgId } = await params
    const { searchParams } = new URL(request.url)
    const targetPlan = searchParams.get('targetPlan') as Plan

    if (!targetPlan) {
      return NextResponse.json({ error: 'Missing required param: targetPlan' }, { status: 400 })
    }

    // Validate target plan
    if (!['FREE', 'PRO', 'TEAM', 'AGENCY'].includes(targetPlan)) {
      return NextResponse.json({ error: 'Invalid targetPlan' }, { status: 400 })
    }

    // Verify org exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const info = await getDowngradeInfo(orgId, targetPlan)

    if (!info) {
      return NextResponse.json({
        message: 'No downgrade needed - same or higher plan',
        orgId,
        targetPlan,
      })
    }

    return NextResponse.json(info)
  } catch (error) {
    console.error('[admin/orgs/downgrade-preview] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
