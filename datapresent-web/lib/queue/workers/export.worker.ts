import { Worker } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { generatePptx, generatePdf, generateDocx } from '@/lib/exporters'
import { uploadToR2 } from '@/lib/r2'
import { PLANS } from '@/lib/entitlements/compat'
import { getRedisConnectionAsync } from '@/lib/redis'
import { extractSignedJobData } from '../job-security'

let workerInstance: Worker | null = null

/**
 * Get or create the export worker (lazy singleton).
 * Connection and worker are created on first call, not at module import time.
 */
export async function getExportWorker(): Promise<Worker> {
  if (workerInstance) return workerInstance

  const conn = await getRedisConnectionAsync()
  if (!conn) throw new Error('Redis connection required for export worker')

  workerInstance = new Worker(
    'export',
    async (job) => {
      // SECURITY: Validate job signature
      const { valid, cleanData } = extractSignedJobData(job.data as any)
      if (!valid) {
        throw new Error('Invalid job signature: unauthorized job submission')
      }

      const { exportId, format, userId } = cleanData as any

      // SECURITY: Validate required fields
      if (!exportId || !userId) {
        throw new Error('Invalid job data: missing exportId or userId')
      }

      const exp = await prisma.export.findUniqueOrThrow({
        where: { id: exportId },
        include: { report: { include: { slides: true, org: { include: { subscription: true, members: { where: { userId } } } } } } },
      })

      // SECURITY: Verify user is member of organization
      if (!exp.report.org.members.length) {
        throw new Error(`User ${userId} is not authorized to export report ${exp.reportId}`)
      }

      try {
        const plan = exp.report.org.subscription?.plan || 'FREE'
        const planConfig = PLANS[plan as keyof typeof PLANS]
        const showWatermark = planConfig?.watermark ?? (plan === 'FREE')

        const slides = exp.report.slides.map(s => ({
          title: s.title,
          layout: s.layout,
          content: s.contentJson as Record<string, unknown>,
          speakerNotes: s.speakerNotes || undefined,
        }))

        let buffer: Buffer

        switch (format) {
          case 'PPTX':
            buffer = await generatePptx({ title: exp.report.title, slides, watermark: showWatermark })
            await uploadToR2(`exports/${exp.id}.pptx`, buffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
            break
          case 'PDF':
            buffer = await generatePdf({ title: exp.report.title, slides })
            await uploadToR2(`exports/${exp.id}.pdf`, buffer, 'application/pdf')
            break
          case 'DOCX':
            buffer = await generateDocx({ title: exp.report.title, slides })
            await uploadToR2(`exports/${exp.id}.docx`, buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
            break
          default:
            throw new Error(`Unsupported export format: ${format}`)
        }

        await prisma.export.update({
          where: { id: exportId },
          data: { status: 'DONE', r2Key: `exports/${exp.id}.${format.toLowerCase()}` },
        })
      } catch (error) {
        console.error('Export worker error:', error instanceof Error ? error.message : String(error))
        await prisma.export.update({
          where: { id: exportId },
          data: { status: 'ERROR' },
        })
        throw error
      }
    },
    { connection: conn, removeOnComplete: { count: 200, age: 3600 }, removeOnFail: { count: 100, age: 86400 } }
  )

  return workerInstance
}
