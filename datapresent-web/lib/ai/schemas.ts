import { z } from 'zod'

export const InsightSchema = z.object({
  type: z.enum(['trend', 'anomaly', 'kpi']),
  text: z.string(),
})

export const SlideContentSchema = z.record(z.string(), z.unknown())

export const SlideSchema = z.object({
  position: z.number(),
  title: z.string(),
  layout: z.enum(['KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'PIE_CHART', 'TEXT_SUMMARY', 'COMPARISON', 'TITLE_SLIDE']),
  content: SlideContentSchema,
  speakerNotes: z.string().optional(),
})

export const AnalysisResponseSchema = z.object({
  title: z.string(),
  insights: z.array(InsightSchema),
  slides: z.array(SlideSchema),
})

export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>