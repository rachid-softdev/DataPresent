import { TrendingUp, Building2, Users, Cloud, FileText } from 'lucide-react'

export interface Template {
  id: string
  name: string
  description: string
  sector: string
  layouts: string[]
  slideCount: { min: number; max: number }
  icon: React.ReactNode
}

export const TEMPLATES: Template[] = [
  {
    id: 'finance-quarterly',
    name: 'Bilan trimestriel',
    description: 'Revenus, margins, budget variance, croissance YoY',
    sector: 'FINANCE',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 8, max: 15 },
    icon: <TrendingUp className="w-6 h-6" />,
  },
  {
    id: 'finance-annual',
    name: 'Rapport annuel',
    description: 'Vue complète de l\'année: bilan, trésorerie, forecast',
    sector: 'FINANCE',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'COMPARISON', 'BAR_CHART', 'LINE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 12, max: 20 },
    icon: <TrendingUp className="w-6 h-6" />,
  },
  {
    id: 'marketing-campaign',
    name: 'Analyse de campagne',
    description: 'Performance des canaux, ROI, conversion funnel',
    sector: 'MARKETING',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 6, max: 12 },
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    id: 'marketing-monthly',
    name: 'Dashboard mensuel',
    description: 'Métriques marketing: CAC, LTV, ROAS, leads',
    sector: 'MARKETING',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'LINE_CHART', 'BAR_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 5, max: 10 },
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    id: 'hr-headcount',
    name: 'Effectifs & turnover',
    description: 'Headcount, attrition, pyramids age/seniorité',
    sector: 'HR',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 6, max: 12 },
    icon: <Users className="w-6 h-6" />,
  },
  {
    id: 'hr-hiring',
    name: 'Recrutement',
    description: 'Hiring velocity, time-to-hire, pipeline, coûts',
    sector: 'HR',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'LINE_CHART', 'BAR_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 5, max: 10 },
    icon: <Users className="w-6 h-6" />,
  },
  {
    id: 'saas-mrr',
    name: 'Metrics SaaS',
    description: 'MRR, ARR, churn, LTV, CAC, burn rate',
    sector: 'SAAS',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'LINE_CHART', 'BAR_CHART', 'COMPARISON', 'TEXT_SUMMARY'],
    slideCount: { min: 8, max: 15 },
    icon: <Cloud className="w-6 h-6" />,
  },
  {
    id: 'saas-product',
    name: 'Product Review',
    description: 'NPS, activation, feature usage, cohort analysis',
    sector: 'SAAS',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'LINE_CHART', 'PIE_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 6, max: 12 },
    icon: <Cloud className="w-6 h-6" />,
  },
  {
    id: 'generic-summary',
    name: 'Résumé exécutif',
    description: 'Vue d\'ensemble avec KPIs et recommandations',
    sector: 'GENERIC',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'TEXT_SUMMARY'],
    slideCount: { min: 4, max: 8 },
    icon: <FileText className="w-6 h-6" />,
  },
  {
    id: 'generic-detailed',
    name: 'Analyse détaillée',
    description: 'Analyse approfondie avec comparaisons et tendances',
    sector: 'GENERIC',
    layouts: ['TITLE_SLIDE', 'KPI_GRID', 'BAR_CHART', 'LINE_CHART', 'PIE_CHART', 'COMPARISON', 'TEXT_SUMMARY'],
    slideCount: { min: 10, max: 20 },
    icon: <FileText className="w-6 h-6" />,
  },
]

export function getTemplatesBySector(sector: string): Template[] {
  return TEMPLATES.filter(t => t.sector === sector)
}

export function getSectorLabel(sector: string): string {
  const labels: Record<string, string> = {
    FINANCE: 'Finance',
    MARKETING: 'Marketing',
    HR: 'Ressources Humaines',
    SAAS: 'SaaS',
    GENERIC: 'Générique',
  }
  return labels[sector] || sector
}

export function getLayoutIcon(layout: string): string {
  const icons: Record<string, string> = {
    TITLE_SLIDE: 'Titre',
    KPI_GRID: 'KPIs',
    BAR_CHART: 'Barres',
    LINE_CHART: 'Lignes',
    PIE_CHART: 'Camembert',
    COMPARISON: 'Comparaison',
    TEXT_SUMMARY: 'Résumé',
  }
  return icons[layout] || layout
}