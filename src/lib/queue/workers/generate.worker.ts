import { Worker } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { parseFile } from '@/lib/parsers'
import { analyzeWithClaude } from '@/lib/ai/analyze'
import { getSignedDownloadUrl } from '@/lib/r2'
import { connection } from '../client'
import { extractSignedJobData } from '../job-security'

export const generateWorker = new Worker(
  'generate',
  async (job) => {
    // SECURITY: Validate job signature
    const { valid, cleanData } = extractSignedJobData(job.data as any)
    if (!valid) {
      throw new Error('Invalid job signature: unauthorized job submission')
    }

    const { reportId, slideCount, language, userId } = cleanData as any

    // SECURITY: Validate required fields
    if (!reportId || !userId) {
      throw new Error('Invalid job data: missing reportId or userId')
    }

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'PROCESSING' },
    })

    try {
      const report = await prisma.report.findUniqueOrThrow({
        where: { id: reportId },
        include: { sourceFile: true, slides: true, org: { include: { members: { where: { userId } } } } },
      })

      // SECURITY: Verify user is member of organization
      if (!report.org.members.length) {
        throw new Error(`User ${userId} is not authorized to access report ${reportId}`)
      }

      // Download the actual file from R2 instead of using an empty buffer
      let parsedData
      if (report.sourceFile) {
        const signedUrl = await getSignedDownloadUrl(report.sourceFile.r2Key)
        const response = await fetch(signedUrl)
        if (!response.ok) {
          throw new Error(`Failed to download file from R2: ${response.statusText}`)
        }
        const buffer = Buffer.from(await response.arrayBuffer())
        parsedData = await parseFile(buffer, report.sourceFile.filename, report.sourceFile.fileType)
      } else {
        throw new Error('No source file found for report')
      }

      const result = await analyzeWithClaude({
        dataJson: JSON.stringify(parsedData),
        sector: report.sector,
        slideCount: slideCount || 10,
        language: language || 'fr',
      })

      // Create a version before regenerating
      const latestVersion = await prisma.reportVersion.findFirst({
        where: { reportId },
        orderBy: { version: 'desc' },
      })

      await prisma.$transaction([
        prisma.reportVersion.create({
          data: {
            reportId,
            version: (latestVersion?.version || 0) + 1,
            title: report.title,
            slideData: {
              slides: report.slides.map(s => ({
                id: s.id,
                position: s.position,
                title: s.title,
                layout: s.layout,
                content: s.contentJson,
                speakerNotes: s.speakerNotes,
              })),
            },
            createdById: userId,
          },
        }),
        prisma.slide.deleteMany({ where: { reportId } }),
        prisma.slide.createMany({
          data: result.slides.map((s) => ({
            reportId,
            position: s.position,
            title: s.title,
            layout: s.layout,
            contentJson: s.content as any,
            speakerNotes: s.speakerNotes || null,
          })),
        }),
        prisma.report.update({
          where: { id: reportId },
          data: { title: result.title, status: 'DONE' },
        }),
      ])
    } catch (error) {
      console.error('Generate worker error:', error instanceof Error ? error.message : String(error))
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'ERROR' },
      })
      throw error
    }
  },
  {
    connection,
    removeOnComplete: { count: 100, age: 3600 },
    removeOnFail: { count: 50, age: 86400 },
    // Retry strategy: max 3 retries with exponential backoff
    limiter: {
      max: 3,
      duration: 60000, // 1 minute between retries
    },
  }
)
