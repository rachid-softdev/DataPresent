'use client'

import type { Slide, SlideLayout } from '@prisma/client'
import { TitleSlide } from './layouts/TitleSlide'
import { KpiGrid } from './layouts/KpiGrid'
import { BarChartSlide } from './layouts/BarChart'
import { LineChartSlide } from './layouts/LineChart'
import { PieChartSlide } from './layouts/PieChart'
import { TextSummary } from './layouts/TextSummary'
import { Comparison } from './layouts/Comparison'

interface SlideCardProps {
  slide: Slide
}

const layoutComponents: Record<SlideLayout, React.FC<{ content: any }>> = {
  TITLE_SLIDE: TitleSlide,
  KPI_GRID: KpiGrid,
  BAR_CHART: BarChartSlide,
  LINE_CHART: LineChartSlide,
  PIE_CHART: PieChartSlide,
  TEXT_SUMMARY: TextSummary,
  COMPARISON: Comparison,
}

export function SlideCard({ slide }: SlideCardProps) {
  const LayoutComponent = layoutComponents[slide.layout]

  if (!LayoutComponent) {
    return (
      <div className="bg-surface rounded-xl border border-border p-8">
        <div className="bg-primary px-6 py-3 rounded-t-lg -mx-8 -mt-8 mb-6">
          <h3 className="text-lg font-semibold text-primary-foreground">{slide.title}</h3>
        </div>
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
          {JSON.stringify(slide.contentJson, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="bg-primary px-8 py-4">
        <h3 className="text-xl font-semibold text-primary-foreground">{slide.title}</h3>
      </div>
      <div className="p-8">
        <LayoutComponent content={slide.contentJson} />
      </div>
      {slide.speakerNotes && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-t border-border px-8 py-4">
          <p className="text-sm text-foreground">
            <span className="font-medium">Notes:</span> {slide.speakerNotes}
          </p>
        </div>
      )}
    </div>
  )
}