// ==========================================
// POST /api/admin/cache/invalidate/:orgId
// Manually invalidate entitlements cache for an org (admin only)
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/admin'
import { invalidateCache } from '@/lib/entitlements'
import { prisma } from '@/lib/prisma'

export const POST = withAdmin(async (req, { params }) => {
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
}, { rateLimit: { limit: 30, windowMs: 60 * 1000 } })
