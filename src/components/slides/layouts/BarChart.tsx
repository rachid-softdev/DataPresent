'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts'

interface BarChartSlideProps {
  content: {
    data?: Array<{ name: string; value: number; color?: string }>
    title?: string
    subtitle?: string
    yAxisLabel?: string
  }
}

export function BarChartSlide({ content }: BarChartSlideProps) {
  const { data = [], title, subtitle, yAxisLabel } = content

  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune donnée de graphique disponible
      </div>
    )
  }

  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#3b82f6']

  return (
    <div>
      {title && <h4 className="text-lg font-semibold mb-1">{title}</h4>}
      {subtitle && <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => yAxisLabel ? `${value}${yAxisLabel}` : value}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              formatter={(value) => [yAxisLabel ? `${value}${yAxisLabel}` : value, '']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || colors[index % colors.length]} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}