// ==========================================
// GET /api/admin/orgs/:orgId/entitlements
// Get entitlements for a specific org (admin only)
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAllEntitlements } from '@/lib/entitlements'
import { prisma } from '@/lib/prisma'

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

    // Verify org exists
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const entitlements = await getAllEntitlements(orgId)

    return NextResponse.json({
      orgId,
      orgName: org.name,
      ...entitlements,
    })
  } catch (error) {
    console.error('[admin/orgs/entitlements] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
