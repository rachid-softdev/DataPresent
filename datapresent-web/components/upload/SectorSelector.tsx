'use client'

import { Building2, TrendingUp, Users, Cloud, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SectorOption {
  value: string
  label: string
  description: string
  icon: React.ReactNode
}

export const SECTOR_OPTIONS: SectorOption[] = [
  {
    value: 'FINANCE',
    label: 'Finance',
    description: 'Revenus, margins, cash flow, budget variance',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    value: 'MARKETING',
    label: 'Marketing',
    description: 'CAC, conversion rates, channel performance, ROI',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    value: 'HR',
    label: 'Ressources Humaines',
    description: 'Headcount, attrition, hiring velocity, engagement',
    icon: <Users className="w-5 h-5" />,
  },
  {
    value: 'SAAS',
    label: 'SaaS',
    description: 'MRR, churn, LTV, NPS, activation rate',
    icon: <Cloud className="w-5 h-5" />,
  },
  {
    value: 'GENERIC',
    label: 'Générique',
    description: 'Métriques clés, tendances, recommandations',
    icon: <FileText className="w-5 h-5" />,
  },
]

interface SectorSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function SectorSelector({ value, onChange, disabled = false }: SectorSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {SECTOR_OPTIONS.map((sector) => (
        <button
          key={sector.value}
          type="button"
          onClick={() => onChange(sector.value)}
          disabled={disabled}
          className={cn(
            "flex flex-col items-start gap-2 p-4 rounded-lg border-2 text-left transition-all",
            value === sector.value
              ? "border-primary bg-primary/5"
              : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <div className={cn(
            "flex items-center gap-2",
            value === sector.value ? "text-primary" : "text-muted-foreground"
          )}>
            {sector.icon}
            <span className="font-semibold">{sector.label}</span>
          </div>
          <span className="text-xs text-muted-foreground line-clamp-2">
            {sector.description}
          </span>
        </button>
      ))}
    </div>
  )
}