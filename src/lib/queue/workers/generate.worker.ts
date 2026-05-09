import { Worker } from 'bullmq'
import { prisma } from '@/lib/prisma'
import { parseFile } from '@/lib/parsers'
import { analyzeWithClaude } from '@/lib/ai/analyze'
import { getSignedDownloadUrl } from '@/lib/r2'
import { connection } from '../client'

export const generateWorker = new Worker(
  'generate',
  async (job) => {
    const { reportId, slideCount, language } = job.data

    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'PROCESSING' },
    })

    try {
      const report = await prisma.report.findUniqueOrThrow({
        where: { id: reportId },
        include: { sourceFile: true },
      })

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

      await prisma.$transaction([
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
  { connection }
)
