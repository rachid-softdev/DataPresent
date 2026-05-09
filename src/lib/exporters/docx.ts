import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { SlideLayout } from '@prisma/client'

interface SlideData {
  title: string
  layout: SlideLayout
  content: Record<string, unknown>
  speakerNotes?: string
}

export async function generateDocx(params: {
  title: string
  slides: SlideData[]
}): Promise<Buffer> {
  const children: Paragraph[] = []

  children.push(
    new Paragraph({
      text: params.title,
      heading: HeadingLevel.TITLE,
    })
  )

  for (const slide of params.slides) {
    children.push(
      new Paragraph({
        text: slide.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    )

    const content = slide.content

    if (slide.layout === 'TEXT_SUMMARY') {
      const points = content.points as string[] || []
      for (const point of points) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${point}` })],
            spacing: { after: 100 },
          })
        )
      }
    } else if (slide.layout === 'KPI_GRID') {
      const kpis = content.kpis as Array<{ label: string; value: string }> || []
      for (const kpi of kpis) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${kpi.label}: `, bold: true }),
              new TextRun({ text: kpi.value }),
            ],
            spacing: { after: 100 },
          })
        )
      }
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: JSON.stringify(content, null, 2) })],
        })
      )
    }

    if (slide.speakerNotes) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: `Notes: ${slide.speakerNotes}`, 
              italics: true, 
              color: '888888',
            }),
          ],
          spacing: { before: 200 },
        })
      )
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Buffer.from(await Packer.toBuffer(doc))
}