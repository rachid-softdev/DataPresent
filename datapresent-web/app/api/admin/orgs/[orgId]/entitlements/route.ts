// ==========================================
// GET /api/admin/orgs/:orgId/entitlements
// Get entitlements for a specific org (admin only)
// ==========================================

import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/lib/admin'
import { getAllEntitlements } from '@/lib/entitlements'
import { prisma } from '@/lib/prisma'

export const GET = withAdmin(async (req, { params }) => {
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
}, { rateLimit: { limit: 30, windowMs: 60 * 1000 } })
