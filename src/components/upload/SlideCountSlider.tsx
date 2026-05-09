'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SlideCountSliderProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
}

export function SlideCountSlider({
  value,
  onChange,
  min = 5,
  max = 20,
  disabled = false,
}: SlideCountSliderProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10)
    setLocalValue(newValue)
    onChange(newValue)
  }

  const getPresetLabel = (count: number): string => {
    if (count <= 5) return 'Minimal'
    if (count <= 10) return 'Standard'
    if (count <= 15) return 'Complet'
    return 'Détaillé'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Nombre de slides</label>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-primary">{localValue}</span>
          <span className={cn(
            "text-xs px-2 py-1 rounded-full",
            localValue <= 5 && "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
            localValue > 5 && localValue <= 10 && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
            localValue > 10 && localValue <= 15 && "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
            localValue > 15 && "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
          )}>
            {getPresetLabel(localValue)}
          </span>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={localValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-muted",
            " [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5",
            " [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md",
            " [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
            " [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full",
            " [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{min}</span>
          <span>{Math.floor((min + max) / 2)}</span>
          <span>{max}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Brief & concis</span>
        <span>Détaillé & complet</span>
      </div>
    </div>
  )
}