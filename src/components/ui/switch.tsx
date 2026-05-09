'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        className="sr-only peer"
        {...props}
      />
      <div
        className={cn(
          'w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-indigo-600',
          'peer-focus:ring-2 peer-focus:ring-indigo-300 peer-checked:after:translate-x-full',
          'after:content-[""] after:absolute after:top-0.5 after:left-[2px]',
          'after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all',
          className
        )}
      />
    </label>
  )
)
Switch.displayName = 'Switch'