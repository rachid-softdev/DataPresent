// ==========================================
// POST /api/admin/cache/invalidate/:orgId
// Manually invalidate entitlements cache for an org (admin only)
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { invalidateCache } from '@/lib/entitlements'
import { prisma } from '@/lib/prisma'

export async function POST(
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

    // Verify org exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    await invalidateCache(orgId)

    return NextResponse.json({
      success: true,
      orgId,
      message: 'Cache invalidated',
    })
  } catch (error) {
    console.error('[admin/cache/invalidate] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
