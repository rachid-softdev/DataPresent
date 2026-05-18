'use client'

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts'

interface LineChartSlideProps {
  content: {
    data?: Array<{ name: string; value?: number; [key: string]: any }>
    title?: string
    subtitle?: string
    yAxisLabel?: string
    showArea?: boolean
    lines?: Array<{ key: string; color: string; name: string }>
  }
}

export function LineChartSlide({ content }: LineChartSlideProps) {
  const { data = [], title, subtitle, yAxisLabel, showArea, lines } = content

  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Aucune donnée de graphique disponible
      </div>
    )
  }

  const lineKeys = lines || []
  const hasMultipleLines = lineKeys.length > 0

  return (
    <div>
      {title && <h4 className="text-lg font-semibold mb-1">{title}</h4>}
      {subtitle && <p className="text-sm text-muted-foreground mb-4">{subtitle}</p>}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {showArea ? (
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickFormatter={(v) => yAxisLabel ? `${v}${yAxisLabel}` : v} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
              {lineKeys.map((line, i) => (
                <Area key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} fill={line.color} fillOpacity={0.1} />
              ))}
            </AreaChart>
          ) : (
            <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: '#e5e7eb' }} tickFormatter={(v) => yAxisLabel ? `${v}${yAxisLabel}` : v} />
              <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }} />
              {hasMultipleLines ? (
                lineKeys.map((line, i) => (
                  <Line key={line.key} type="monotone" dataKey={line.key} name={line.name} stroke={line.color} strokeWidth={2} dot={{ r: 4 }} />
                ))
              ) : (
                <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
              )}
            </RechartsLineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}