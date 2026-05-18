import PptxGenJS from 'pptxgenjs'
import { SlideLayout } from '@prisma/client'

interface SlideData {
  title: string
  layout: SlideLayout
  content: Record<string, unknown>
  speakerNotes?: string
}

interface ExportParams {
  title: string
  slides: SlideData[]
  watermark?: boolean
}

export async function generatePptx(params: ExportParams): Promise<Buffer> {
  const pres = new PptxGenJS()

  pres.layout = 'LAYOUT_16x9'
  pres.title = params.title
  pres.author = 'DataPresent'
  pres.company = 'DataPresent'

  for (const slideData of params.slides) {
    const slide = pres.addSlide()

    slide.background = { color: 'FFFFFF' }

    slide.addText(slideData.title, {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: '1a1a2e',
    })

    const content = slideData.content

    switch (slideData.layout) {
      case 'TITLE_SLIDE':
        slide.addText(params.title, {
          x: 0.5,
          y: 2.5,
          w: '90%',
          h: 1.5,
          fontSize: 44,
          bold: true,
          color: '1a1a2e',
          align: 'center',
        })
        if (content.subtitle) {
          slide.addText(content.subtitle as string, {
            x: 0.5,
            y: 4,
            w: '90%',
            h: 0.8,
            fontSize: 20,
            color: '666666',
            align: 'center',
          })
        }
        break

      case 'KPI_GRID':
        const kpis = content.kpis as Array<{ label: string; value: string; change?: string }> || []
        const cols = 3
        const colWidth = 2.8
        const startX = 0.5
        const startY = 1.8

        kpis.forEach((kpi, idx) => {
          const row = Math.floor(idx / cols)
          const col = idx % cols
          const x = startX + col * (colWidth + 0.3)
          const y = startY + row * 1.8

          slide.addText(kpi.label, {
            x, y, w: colWidth, h: 0.4,
            fontSize: 12, color: '888888',
          })
          slide.addText(kpi.value, {
            x, y: y + 0.4, w: colWidth, h: 0.6,
            fontSize: 28, bold: true, color: '1a1a2e',
          })
          if (kpi.change) {
            slide.addText(kpi.change, {
              x, y: y + 1, w: colWidth, h: 0.4,
              fontSize: 12, color: '22c55e',
            })
          }
        })
        break

      case 'BAR_CHART':
        const barData = content.data as Array<{ label: string; value: number }> || []
        const chartData = barData.map(d => [d.label, d.value])
        slide.addChart(pres.ChartType.bar, chartData, {
          x: 0.5, y: 1.5, w: 9, h: 5,
          chartColors: ['4f46e5'],
        })
        break

      case 'LINE_CHART':
        const lineData = content.data as Array<{ label: string; value: number }> || []
        const lineChartData = lineData.map(d => [d.label, d.value])
        slide.addChart(pres.ChartType.line, lineChartData, {
          x: 0.5, y: 1.5, w: 9, h: 5,
          chartColors: ['4f46e5'],
        })
        break

      case 'PIE_CHART':
        const pieData = content.data as Array<{ label: string; value: number }> || []
        const pieChartData = pieData.map(d => [d.label, d.value])
        slide.addChart(pres.ChartType.doughnut, pieChartData, {
          x: 1, y: 1.5, w: 7, h: 5,
          chartColors: ['4f46e5', '22c55e', 'f59e0b', 'ef4444', '888888'],
        })
        break

      case 'TEXT_SUMMARY':
        const points = content.points as string[] || []
        points.forEach((point, idx) => {
          slide.addText(`• ${point}`, {
            x: 0.5, y: 1.5 + idx * 0.6, w: 9, h: 0.5,
            fontSize: 16, color: '333333',
          })
        })
        break

      case 'COMPARISON':
        const leftItems = content.left as string[] || []
        const rightItems = content.right as string[] || []
        
        slide.addText('Comparaison', {
          x: 0.5, y: 1.3, w: 4, h: 0.4,
          fontSize: 14, bold: true, color: '4f46e5', align: 'center',
        })
        leftItems.forEach((item, idx) => {
          slide.addText(`• ${item}`, {
            x: 0.5, y: 1.7 + idx * 0.5, w: 4, h: 0.4,
            fontSize: 12, color: '333333',
          })
        })

        slide.addText('vs', {
          x: 4.5, y: 3, w: 1, h: 0.4,
          fontSize: 14, bold: true, color: '888888', align: 'center',
        })

        slide.addText('Comparaison', {
          x: 5.5, y: 1.3, w: 4, h: 0.4,
          fontSize: 14, bold: true, color: '22c55e', align: 'center',
        })
        rightItems.forEach((item, idx) => {
          slide.addText(`• ${item}`, {
            x: 5.5, y: 1.7 + idx * 0.5, w: 4, h: 0.4,
            fontSize: 12, color: '333333',
          })
        })
        break

      default:
        slide.addText(JSON.stringify(content), {
          x: 0.5, y: 2, w: 9, h: 4,
          fontSize: 14, color: '666666',
        })
    }

    if (slideData.speakerNotes) {
      slide.addNotes(slideData.speakerNotes)
    }
  }

  if (params.watermark) {
    const watermarkSlide = pres.addSlide()
    watermarkSlide.background = { color: 'FFFFFF' }
    watermarkSlide.addText('Generated with DataPresent', {
      x: 0, y: '95%', w: '100%', h: 0.5,
      fontSize: 10, color: 'CCCCCC', align: 'center',
    })
  }

  // pptxgenjs returns different types depending on environment
  // In Node.js, specifying outputType ensures we get a Buffer
  const result = await pres.write({ outputType: 'nodebuffer' })
  return Buffer.isBuffer(result) ? result : Buffer.from(result as string)
}
