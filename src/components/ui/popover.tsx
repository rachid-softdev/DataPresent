'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  content: React.ReactNode
}

export function Popover({ open, onOpenChange, children, content }: PopoverProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange?.(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onOpenChange])

  return (
    <div ref={ref} className="relative inline-block">
      {children}
      {open && (
        <div className="absolute z-50 mt-1 w-56 bg-surface border border-border rounded-md shadow-lg p-2">
          {content}
        </div>
      )}
    </div>
  )
}
