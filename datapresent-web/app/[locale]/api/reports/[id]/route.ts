import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unauthorized, forbidden, notFound } from '@/lib/errors'

/**
 * DELETE /api/reports/[id]
 * Delete a report and all associated data
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id } = await params

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      org: {
        include: {
          members: { where: { userId: session.user.id } }
        }
      }
    }
  })

  if (!report) {
    return notFound()
  }

  // Only org members can delete reports
  if (!report.org.members.length) {
    return forbidden()
  }

  // Delete report and all related data (cascades via Prisma schema)
  await prisma.report.delete({
    where: { id }
  })

  return NextResponse.json({ message: 'messages.reports.deleted' })
}
