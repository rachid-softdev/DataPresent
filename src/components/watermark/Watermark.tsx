'use client'

import { cn } from '@/lib/utils'

interface WatermarkProps {
  show?: boolean
  className?: string
  position?: 'bottom-right' | 'bottom-center' | 'footer'
}

export function Watermark({ 
  show = true, 
  className,
  position = 'bottom-right'
}: WatermarkProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        "text-xs text-muted-foreground opacity-40 font-medium",
        position === 'bottom-right' && "absolute bottom-4 right-4",
        position === 'bottom-center' && "absolute bottom-4 left-1/2 -translate-x-1/2",
        position === 'footer' && "text-center py-4",
        className
      )}
    >
      Généré avec DataPresent
    </div>
  )
}

interface PlanWatermarkProps {
  plan: string | null
  showOnExports?: boolean
}

export function PlanWatermark({ plan, showOnExports = true }: PlanWatermarkProps) {
  const showWatermark = plan === 'FREE' || !plan

  return <Watermark show={showWatermark} />
}