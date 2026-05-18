// ==========================================
// GET /api/debug/entitlements
// Debug trace for a specific org/feature (admin only)
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDebugTrace } from '@/lib/entitlements'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const feature = searchParams.get('feature')

    if (!orgId || !feature) {
      return NextResponse.json(
        { error: 'Missing required params: orgId, feature' },
        { status: 400 }
      )
    }

    const trace = await getDebugTrace(orgId, feature)

    return NextResponse.json(trace)
  } catch (error) {
    console.error('[debug/entitlements] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
