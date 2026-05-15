import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unauthorized, forbidden, notFound } from '@/lib/errors'

/**
 * PATCH /api/reports/[id]/reorder
 * Reorder slides within a report
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id } = await params
  const { slideOrder } = await req.json()

  if (!Array.isArray(slideOrder)) {
    return NextResponse.json({ error: 'Invalid slide order' }, { status: 400 })
  }

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

  if (!report.org.members.length) {
    return forbidden()
  }

  // Update positions in a transaction
  await prisma.$transaction(
    slideOrder.map((item: { id: string; position: number }) =>
      prisma.slide.update({
        where: { id: item.id, reportId: id },
        data: { position: item.position },
      })
    )
  )

  return NextResponse.json({ success: true })
}
