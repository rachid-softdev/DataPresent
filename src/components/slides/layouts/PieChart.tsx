'use client'

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'

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

  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        Aucune donnée de graphique disponible
      </div>
    )
  }

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#3b82f6', '#ef4444', '#14b8a6']

  return (
    <div>
      {title && <h4 className="text-lg font-semibold mb-1">{title}</h4>}
      {subtitle && <p className="text-sm text-gray-500 mb-4">{subtitle}</p>}
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
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
            />
            {showLegend && <Legend />}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}