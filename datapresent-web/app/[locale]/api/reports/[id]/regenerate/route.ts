import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateQueue } from '@/lib/queue'
import { signJobData } from '@/lib/queue/job-security'
import { ERROR_CODES, unauthorized, forbidden, notFound, badRequest } from '@/lib/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  const { id: reportId } = await params

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      org: { include: { members: true } },
      sourceFile: true
    }
  })

  if (!report) {
    return notFound(ERROR_CODES.ERR_RESOURCE_NOT_FOUND)
  }

  const isMember = report.org.members.some(m => m.userId === session.user.id)
  if (!isMember) {
    return forbidden()
  }

  if (!report.sourceFile) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_NO_SOURCE_FILE)
  }

  if (report.status === 'PROCESSING') {
    return badRequest(ERROR_CODES.ERR_RESOURCE_ALREADY_GENERATING)
  }

  const { sector, slideCount } = await req.json().catch(() => ({}))

  const updateData: any = {
    status: 'PENDING',
    title: report.title
  }

  if (sector) {
    updateData.sector = sector
  }

  await prisma.report.update({
    where: { id: reportId },
    data: updateData
  })

  await prisma.slide.deleteMany({
    where: { reportId }
  })

  // SECURITY: Sign job data with userId
  const signedJob = signJobData({
    reportId,
    userId: session.user.id,
    ...(slideCount && { slideCount }),
  })
  await generateQueue.add('generate', signedJob)

  return NextResponse.json({
    reportId,
    status: 'PENDING'
  })
}