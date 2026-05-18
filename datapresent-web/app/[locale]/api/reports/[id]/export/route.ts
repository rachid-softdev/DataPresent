import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { exportQueue } from '@/lib/queue'
import { checkRateLimit } from '@/lib/rate-limit'
import { signJobData } from '@/lib/queue/job-security'
import { canUseFormat } from '@/lib/plan-utils'
import { ExportFormat } from '@prisma/client'
import { ERROR_CODES, unauthorized, notFound, forbidden, badRequest } from '@/lib/errors'

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
    include: { org: { include: { members: true, subscription: true } } },
  })

  if (!report) {
    return notFound()
  }

  const isMember = report.org.members.some(m => m.userId === session.user.id)
  if (!isMember) {
    return forbidden()
  }

  // SECURITY: Check format permissions based on plan
  const plan = report.org.subscription?.plan || 'FREE'
  if (!canUseFormat(plan as any, format)) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_FORMAT_NOT_ALLOWED)
  }

  const exp = await prisma.export.create({
    data: {
      reportId: id,
      format: format as ExportFormat,
    },
  })

  // SECURITY: Sign job data with userId
  const signedJob = signJobData({
    exportId: exp.id,
    format,
    userId: session.user.id,
  })
  await exportQueue.add('export', signedJob)

  return NextResponse.json({ exportId: exp.id })
}