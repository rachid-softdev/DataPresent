import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unauthorized } from '@/lib/errors'
import { ReportStatus, Sector } from '@prisma/client'

/**
 * GET /api/reports
 * Get paginated list of reports with optional filters
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { searchParams } = new URL(req.url)

  // Pagination
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
  const skip = (page - 1) * limit

  // Filters
  const search = searchParams.get('search')?.trim() || undefined
  const status = searchParams.get('status') as ReportStatus | null
  const sector = searchParams.get('sector') as Sector | null
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // Get user's organization
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      membership: {
        include: {
          org: true
        }
      }
    }
  })

  const org = user?.membership[0]?.org
  if (!org) {
    return NextResponse.json({ reports: [], total: 0, page, totalPages: 0, hasMore: false })
  }

  // Build where clause
  const where: Record<string, unknown> = { orgId: org.id }
  if (search) {
    where.title = { contains: search, mode: 'insensitive' }
  }
  if (status && status !== 'all' as unknown) {
    where.status = status
  }
  if (sector && sector !== 'all' as unknown) {
    where.sector = sector
  }

  // Count total
  const total = await prisma.report.count({ where })

  // Fetch reports
  const reports = await prisma.report.findMany({
    where,
    orderBy: {
      [sortBy === 'title' ? 'title' : 'createdAt']: sortOrder,
    },
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      sector: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    }
  })

  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({
    reports,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  })
}
