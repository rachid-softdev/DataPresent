'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface KpiGridProps {
  content: {
    kpis?: Array<{
      label: string
      value: string | number
      change?: number
      changeType?: 'increase' | 'decrease' | 'neutral'
      sublabel?: string
    }>
  }
}

export function KpiGrid({ content }: KpiGridProps) {
  const { kpis = [] } = content

  const getTrendIcon = (type?: string) => {
    if (type === 'increase') return <TrendingUp className="w-4 h-4 text-green-500" />
    if (type === 'decrease') return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-muted-foreground" />
  }

  const getChangeColor = (type?: string) => {
    if (type === 'increase') return 'text-green-600 dark:text-green-400'
    if (type === 'decrease') return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  if (kpis.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune donnée KPI disponible
      </div>
    )
  }

  const gridClass = kpis.length <= 2 ? 'grid-cols-2' : kpis.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'

  return (
    <div className={`grid ${gridClass} gap-4`}>
      {kpis.map((kpi, i) => (
        <Card key={i} className="p-4">
          <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-foreground">{kpi.value}</span>
            {kpi.change !== undefined && (
              <span className={`text-sm flex items-center gap-1 ${getChangeColor(kpi.changeType)}`}>
                {getTrendIcon(kpi.changeType)}
                {Math.abs(kpi.change)}%
              </span>
            )}
          </div>
          {kpi.sublabel && (
            <p className="text-xs text-muted-foreground mt-1">{kpi.sublabel}</p>
          )}
        </Card>
      ))}
    </div>
  )
}
