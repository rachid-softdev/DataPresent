import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadToR2 } from '@/lib/r2'
import { generateQueue } from '@/lib/queue'
import { canCreateReport, canHaveSlideCount } from '@/lib/plan-utils'
import { checkRateLimit } from '@/lib/rate-limit'
import { signJobData } from '@/lib/queue/job-security'
import { ERROR_CODES, unauthorized, badRequest } from '@/lib/errors'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return unauthorized()
  }

  // Rate limiting: 20 uploads per hour per user
  const rateLimitAllowed = await checkRateLimit(`upload:${session.user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rateLimitAllowed) {
    return NextResponse.json({ error: ERROR_CODES.ERR_VALIDATION_RATE_LIMIT }, { status: 429 })
  }

  const { allowed, reason, upgrade } = await canCreateReport(session.user.id)
  if (!allowed) {
    return NextResponse.json({ error: ERROR_CODES.ERR_RESOURCE_NOT_FOUND, upgrade }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File
  const sector = formData.get('sector') as string
  const slideCount = parseInt(formData.get('slideCount') as string) || 10
  const language = (formData.get('language') as string) || 'fr'

  if (!file || !sector) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_FILE_REQUIRED)
  }

  // Validate slide count against plan
  const { plan } = await import('@/lib/plan-utils').then(m => m.getUserPlan(session.user.id))
  const { allowed: slideLimitOk, maxSlides } = canHaveSlideCount(plan, slideCount)
  if (!slideLimitOk) {
    return NextResponse.json(
      { error: `Limite de ${maxSlides} slides atteinte pour ce rapport.` },
      { status: 403 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { membership: { include: { org: true } } },
  })

  const org = user?.membership[0]?.org
  if (!org) {
    return badRequest(ERROR_CODES.ERR_RESOURCE_NO_ORGANIZATION)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.name.split('.').pop()?.toLowerCase()
  const fileTypeMap: Record<string, string> = { csv: 'CSV', pdf: 'PDF', xlsx: 'XLSX', xls: 'XLSX', gsheet: 'GSHEET' }
  const fileType = fileTypeMap[ext || ''] || 'XLSX'

  const r2Key = `uploads/${org.id}/${Date.now()}-${file.name}`
  await uploadToR2(r2Key, buffer, file.type)

  const report = await prisma.report.create({
    data: {
      title: file.name.replace(/\.[^/.]+$/, ''),
      sector: sector as any,
      orgId: org.id,
      slideCount,
      language,
      sourceFile: {
        create: {
          filename: file.name,
          fileType: fileType as any,
          r2Key,
          sizeBytes: file.size,
        },
      },
    },
  })

  // SECURITY: Sign job data with userId for worker authorization
  const signedJob = signJobData({
    reportId: report.id,
    slideCount,
    language,
    userId: session.user.id,
  })
  await generateQueue.add('generate', signedJob)

  return NextResponse.json({ reportId: report.id })
}