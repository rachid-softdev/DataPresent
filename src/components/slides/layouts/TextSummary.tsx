'use client'

import { Lightbulb, Target, AlertTriangle } from 'lucide-react'

interface TextSummaryProps {
  content: {
    sections?: Array<{
      title?: string
      text: string
      type?: 'insight' | 'recommendation' | 'warning'
    }>
    bullets?: string[]
    conclusion?: string
  }
}

export function TextSummary({ content }: TextSummaryProps) {
  const { sections = [], bullets = [], conclusion } = content

  const getIcon = (type?: string) => {
    switch (type) {
      case 'insight': return <Lightbulb className="w-5 h-5 text-amber-500" />
      case 'recommendation': return <Target className="w-5 h-5 text-green-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-red-500" />
      default: return null
    }
  }

  const getBgColor = (type?: string) => {
    switch (type) {
      case 'insight': return 'bg-amber-50 border-amber-200'
      case 'recommendation': return 'bg-green-50 border-green-200'
      case 'warning': return 'bg-red-50 border-red-200'
      default: return 'bg-muted/50 border-border'
    }
  }

  return (
    <div className="space-y-4">
      {sections.length > 0 && sections.map((section, i) => (
        <div key={i} className={`p-4 rounded-lg border ${getBgColor(section.type)}`}>
          <div className="flex items-start gap-3">
            {getIcon(section.type)}
            <div>
              {section.title && <h5 className="font-medium mb-1">{section.title}</h5>}
              <p className="text-sm text-gray-700">{section.text}</p>
            </div>
          </div>
        </div>
      ))}

      {bullets.length > 0 && (
        <ul className="space-y-2">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <span className="text-sm text-foreground">{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {conclusion && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
          <h5 className="font-medium text-primary mb-1">Conclusion</h5>
          <p className="text-sm text-foreground">{conclusion}</p>
        </div>
      )}
    </div>
  )
}