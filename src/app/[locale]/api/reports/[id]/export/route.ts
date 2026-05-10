import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exportQueue } from '@/lib/queue'
import { checkRateLimit } from '@/lib/rate-limit'
import { ExportFormat } from '@prisma/client'
import { ERROR_CODES, unauthorized, notFound, forbidden } from '@/lib/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  // Rate limiting: 20 exports per hour per user
  const allowed = await checkRateLimit(`export:${session.user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!allowed) {
    return NextResponse.json({ error: ERROR_CODES.ERR_VALIDATION_RATE_LIMIT }, { status: 429 })
  }

  const { id } = await params
  const { format } = await req.json()

  const report = await prisma.report.findUnique({
    where: { id },
    include: { org: { include: { members: true } } },
  })

  if (!report) {
    return notFound()
  }

  const isMember = report.org.members.some(m => m.userId === session.user.id)
  if (!isMember) {
    return forbidden()
  }

  const exp = await prisma.export.create({
    data: {
      reportId: id,
      format: format as ExportFormat,
    },
  })

  await exportQueue.add('export', { exportId: exp.id, format })

  return NextResponse.json({ exportId: exp.id })
}