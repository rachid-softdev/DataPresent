'use client'

import { useMemo } from 'react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { getChartColors } from './chart-colors'

interface PieChartSlideProps {
  content: {
    data?: Array<{ name: string; value: number; color?: string }>
    title?: string
    subtitle?: string
    showLegend?: boolean
    innerRadius?: number
  }
}

export function PieChartSlide({ content }: PieChartSlideProps) {
  const { data = [], title, subtitle, showLegend = true, innerRadius = 0 } = content
  const colors = useMemo(() => getChartColors(), [])

  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune donnée de graphique disponible
      </div>
    )
  }

  return (
    <div>
      {title && <h4 className="text-lg font-semibold mb-1">{title}</h4>}
      {subtitle && <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>}
      <div className="h-72 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--foreground)',
              }}
            />
            {showLegend && <Legend />}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}