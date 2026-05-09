import { Worker } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { generatePptx, generatePdf, generateDocx } from '@/lib/exporters'
import { uploadToR2 } from '@/lib/r2'
import { PLANS } from '@/lib/plans'
import { connection } from '../client'

export const exportWorker = new Worker(
  'export',
  async (job) => {
    const { exportId, format } = job.data

    const exp = await prisma.export.findUniqueOrThrow({
      where: { id: exportId },
      include: { report: { include: { slides: true, org: { include: { subscription: true } } } } },
    })

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
  { connection }
)
