export function buildAnalysisPrompt(params: {
  dataJson: string
  sector: string
  slideCount: number
  language: 'fr' | 'en'
}): string {
  return `You are a senior data analyst specialized in ${params.sector}.
Analyze the following dataset and generate a structured presentation.

STRICT JSON output only. No markdown. No preamble.

Response schema:
{
  "title": string,
  "insights": [
    { "type": "trend" | "anomaly" | "kpi", "text": string }
  ],
  "slides": [
    {
      "position": number,
      "title": string,
      "layout": "KPI_GRID" | "BAR_CHART" | "LINE_CHART" | "PIE_CHART" | "TEXT_SUMMARY" | "COMPARISON" | "TITLE_SLIDE",
      "content": object,
      "speakerNotes": string
    }
  ]
}

Rules:
- Generate exactly ${params.slideCount} slides
- First slide must be layout TITLE_SLIDE
- Last slide must be layout TEXT_SUMMARY (key takeaways)
- Language: ${params.language === 'fr' ? 'French' : 'English'}
- Focus on: trends, anomalies, top performers, actionable insights
- Sector context: ${getSectorContext(params.sector)}

Data:
${params.dataJson}`
}

function getSectorContext(sector: string): string {
  const contexts: Record<string, string> = {
    FINANCE: 'Focus on revenue, margins, cash flow, budget variance, YoY growth',
    MARKETING: 'Focus on CAC, conversion rates, channel performance, ROI, funnel metrics',
    HR: 'Focus on headcount, attrition, hiring velocity, compensation bands, engagement',
    SAAS: 'Focus on MRR, churn, LTV, NPS, activation rate, expansion revenue',
    GENERIC: 'Focus on key metrics, trends, outliers, and actionable recommendations',
  }
  return contexts[sector] ?? contexts.GENERIC
}