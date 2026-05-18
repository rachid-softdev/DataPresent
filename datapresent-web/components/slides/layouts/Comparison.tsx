'use client'

import { Card } from '@/components/ui/card'
import { Check, X } from 'lucide-react'

interface ComparisonProps {
  content: {
    leftTitle?: string
    rightTitle?: string
    rows?: Array<{
      label: string
      left?: string | boolean | number
      right?: string | boolean | number
      highlight?: 'left' | 'right' | 'both'
    }>
    summary?: string
  }
}

export function Comparison({ content }: ComparisonProps) {
  const { leftTitle = 'Option A', rightTitle = 'Option B', rows = [], summary } = content

  const renderValue = (value: string | boolean | number | undefined) => {
    if (value === true) return <Check className="w-5 h-5 text-green-500" />
    if (value === false) return <X className="w-5 h-5 text-red-400" />
    if (typeof value === 'number') return <span className="font-semibold">{value.toLocaleString()}</span>
    return <span>{value || '-'}</span>
  }

  const getHighlight = (highlight?: string, side?: 'left' | 'right') => {
    if (highlight === side) return 'bg-indigo-50'
    if (highlight === 'both') return 'bg-indigo-50'
    return ''
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center font-medium text-muted-foreground">Critères</div>
        <div className="text-center font-semibold text-gray-900">{leftTitle}</div>
        <div className="text-center font-semibold text-gray-900">{rightTitle}</div>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className={`grid grid-cols-3 gap-4 p-3 rounded-lg ${getHighlight(row.highlight, 'left')} ${getHighlight(row.highlight, 'right')}`}>
            <div className="text-sm text-gray-700 font-medium">{row.label}</div>
            <div className="text-center text-sm">{renderValue(row.left)}</div>
            <div className="text-center text-sm">{renderValue(row.right)}</div>
          </div>
        ))}
      </div>

      {summary && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{summary}</p>
        </div>
      )}
    </div>
  )
}