import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logApiError } from '@/lib/security'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: reportId } = await params

    // Check if user has access to this report
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { org: { include: { members: true } } },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const isMember = report.org.members.some(m => m.userId === session.user.id)
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all versions
    const versions = await prisma.reportVersion.findMany({
      where: { reportId },
      orderBy: { version: 'desc' },
      include: {
        createdBy: {
          select: { name: true, email: true, image: true }
        }
      }
    })

    return NextResponse.json({ versions })
  } catch (error) {
    await logApiError(error as Error, { path: `/api/reports/${await params.then(p => p.id)}/versions`, method: 'GET' })
    return NextResponse.json({ error: 'An error occurred' }, { status: 500 })
  }
}