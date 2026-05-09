import { cn } from '@/lib/utils'

interface PlanBadgeProps {
  plan: string
  className?: string
}

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
  FREE: {
    label: 'Gratuit',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  PRO: {
    label: 'Pro',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  TEAM: {
    label: 'Team',
    className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.FREE

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}