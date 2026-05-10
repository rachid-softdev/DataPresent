'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface AccordionItem {
  id: string
  title: string
  content: React.ReactNode
}

interface AccordionProps {
  items: AccordionItem[]
  className?: string
}

export function Accordion({ items, className }: AccordionProps) {
  const [openId, setOpenId] = React.useState<string | null>(null)

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => (
        <div key={item.id} className="border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="font-medium text-foreground">{item.title}</span>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-muted-foreground transition-transform',
                openId === item.id && 'rotate-180'
              )}
            />
          </button>
          {openId === item.id && (
            <div className="p-4 border-t border-border bg-muted/30 text-sm text-muted-foreground">
              {item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
