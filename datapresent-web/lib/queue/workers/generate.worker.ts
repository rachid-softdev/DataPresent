import { Worker, Job } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { parseFile } from '@/lib/parsers'
import { analyzeWithClaude } from '@/lib/ai/analyze'
import { getSignedDownloadUrl } from '@/lib/r2'
import { connection } from '../client'
import { extractSignedJobData } from '../job-security'
import { captureException, captureMessage } from '@/lib/sentry'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_BACKOFF = [2000, 4000, 8000] // 2s, 4s, 8s exponential backoff

export const generateWorker = new Worker(
  'generate',
  async (job: Job) => {
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

      captureMessage(`Report ${reportId} generated successfully`, 'info', {
        slideCount: result.slides.length,
        jobId: job.id,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Generate worker error:', errorMessage)
      
      await prisma.report.update({
        where: { id: reportId },
        data: { status: 'ERROR' },
      })

      captureException(error instanceof Error ? error : new Error(errorMessage), {
        reportId,
        jobId: job.id,
        attempts: job.attemptsMade,
      })
      
      throw error
    }
  },
  {
    connection,
    // Remove completed jobs after 1 hour, keep 100
    removeOnComplete: { count: 100, age: 3600 },
    // Remove failed jobs after 1 day, keep 500 for debugging
    removeOnFail: { count: 500, age: 86400 },
    // Rate limiting: max 3 jobs per minute
    limiter: {
      max: 3,
      duration: 60000,
    },
    // Retry strategy: exponential backoff with max 3 retries
    retryStrategy: (job: Job) => {
      if (job.attemptsMade >= MAX_RETRIES) {
        captureMessage(`Job ${job.id} failed after ${MAX_RETRIES} retries`, 'error', {
          jobId: job.id,
          reportId: job.data.reportId,
        })
        return null // No more retries
      }
      const delay = RETRY_BACKOFF[job.attemptsMade - 1] || RETRY_BACKOFF[RETRY_BACKOFF.length - 1]
      return delay
    },
  }
)

// Dead letter queue handler - called when job fails after all retries
generateWorker.on('failed', async (job: Job | undefined) => {
  if (!job) return

  const reportId = job.data?.reportId

  if (reportId) {
    // Update report status to ERROR
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'ERROR' },
    }).catch(() => {
      // Ignore if report doesn't exist anymore
    })

    captureMessage(
      `Report generation failed permanently: ${reportId}`,
      'error',
      {
        jobId: job.id,
        reportId,
        failedReason: job.failedReason,
        attempts: job.attemptsMade,
      }
    )
  }
})

// Progress event handler for frontend polling
generateWorker.on('progress', (job: Job | undefined) => {
  if (!job) return

  captureMessage(`Job ${job.id} progress: ${job.progress}`, 'debug', {
    jobId: job.id,
    reportId: job.data?.reportId,
  })
})
