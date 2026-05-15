import { Sector } from '@prisma/client'
import { Calculator, TrendingUp, Users, BarChart3, FileText } from 'lucide-react'

export type TemplateSector = Sector | 'ALL'

export interface Template {
  id: string
  name: string
  description: string
  sector: Sector
  icon: React.ReactNode
  layouts: string[]
  slideCount: {
    min: number
    max: number
  }
}

export const TEMPLATES: Template[] = [
  // Finance Templates
  {
    id: 'finance-quarterly',
    name: 'Quarterly Review',
    description: 'Revue trimestrielle complète avec KPIs financiers, variance budget et tendances',
    sector: 'FINANCE',
    icon: <Calculator className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 8, max: 15 },
  },
  {
    id: 'finance-annual',
    name: 'Annual Report',
    description: 'Rapport annuel détaillé avec analyse year-over-year et projections',
    sector: 'FINANCE',
    icon: <TrendingUp className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'PIE_CHART', 'COMPARISON', 'TEXT_SUMMARY'],
    slideCount: { min: 12, max: 25 },
  },
  {
    id: 'finance-budget',
    name: 'Budget Review',
    description: 'Analyse budgétaire avec variance, forecasts et recommandations',
    sector: 'FINANCE',
    icon: <Calculator className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'COMPARISON', 'TEXT_SUMMARY'],
    slideCount: { min: 6, max: 12 },
  },

  // Marketing Templates
  {
    id: 'marketing-campaign',
    name: 'Campaign Results',
    description: 'Résultats de campagne marketing avec ROI, conversion et funnel analytics',
    sector: 'MARKETING',
    icon: <TrendingUp className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 8, max: 15 },
  },
  {
    id: 'marketing-channel',
    name: 'Channel Performance',
    description: 'Analyse des canaux marketing avec CAC, LTV et attribution',
    sector: 'MARKETING',
    icon: <BarChart3 className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'COMPARISON', 'TEXT_SUMMARY'],
    slideCount: { min: 6, max: 12 },
  },
  {
    id: 'marketing-social',
    name: 'Social Media Analytics',
    description: 'Métriques社交媒体 avec engagement, reach et sentiment analysis',
    sector: 'MARKETING',
    icon: <TrendingUp className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 5, max: 10 },
  },

  // HR Templates
  {
    id: 'hr-headcount',
    name: 'Headcount Analytics',
    description: 'Analyse des effectifs avec turnover, hiring velocity et attrition',
    sector: 'HR',
    icon: <Users className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 6, max: 12 },
  },
  {
    id: 'hr-compensation',
    name: 'Compensation Review',
    description: 'Analyse de rémunération avec benchmarks, bands et equity distribution',
    sector: 'HR',
    icon: <Calculator className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'PIE_CHART', 'COMPARISON', 'TEXT_SUMMARY'],
    slideCount: { min: 5, max: 10 },
  },
  {
    id: 'hr-engagement',
    name: 'Employee Engagement',
    description: 'Survey results avec NPS, satisfaction et trends',
    sector: 'HR',
    icon: <Users className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'LINE_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 5, max: 10 },
  },

  // SaaS Templates
  {
    id: 'saas-mrr',
    name: 'MRR Dashboard',
    description: 'Métriques SaaS avec MRR, ARR, churn et expansion revenue',
    sector: 'SAAS',
    icon: <TrendingUp className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'LINE_CHART', 'BAR_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 8, max: 15 },
  },
  {
    id: 'saas-product',
    name: 'Product Metrics',
    description: 'Métriques produit avec activation, retention et feature adoption',
    sector: 'SAAS',
    icon: <BarChart3 className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'LINE_CHART', 'BAR_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 6, max: 12 },
  },
  {
    id: 'saas-customer',
    name: 'Customer Health',
    description: 'Santé client avec NPS, usage et risk scoring',
    sector: 'SAAS',
    icon: <Users className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'PIE_CHART', 'BAR_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 5, max: 10 },
  },

  // Generic Templates
  {
    id: 'generic-dashboard',
    name: 'Executive Dashboard',
    description: 'Vue exécutive avec KPIs clés et tendances',
    sector: 'GENERIC',
    icon: <FileText className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 5, max: 10 },
  },
  {
    id: 'generic-analysis',
    name: 'Data Analysis',
    description: 'Analyse de données générique avec insights et recommandations',
    sector: 'GENERIC',
    icon: <BarChart3 className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'PIE_CHART', 'COMPARISON', 'TEXT_SUMMARY'],
    slideCount: { min: 8, max: 15 },
  },
  {
    id: 'generic-summary',
    name: 'Executive Summary',
    description: 'Résumé exécutif concis pour présentations rapides',
    sector: 'GENERIC',
    icon: <FileText className="h-5 w-5" />,
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'TEXT_SUMMARY'],
    slideCount: { min: 3, max: 6 },
  },
]

export function getSectorLabel(sector: string): string {
  const labels: Record<string, string> = {
    ALL: 'Tous les secteurs',
    FINANCE: 'Finance',
    MARKETING: 'Marketing',
    HR: 'Ressources Humaines',
    SAAS: 'SaaS',
    GENERIC: 'Générique',
  }
  return labels[sector] || sector
}

export function getTemplatesBySector(sector: TemplateSector): Template[] {
  if (sector === 'ALL') {
    return TEMPLATES
  }
  return TEMPLATES.filter(t => t.sector === sector)
}

export function getTemplateById(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id)
}