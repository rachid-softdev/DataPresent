import { LucideIcon, FileText } from 'lucide-react'
import { Button, type ButtonProps } from './button'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
    variant?: ButtonProps['variant']
  }
  className?: string
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      )}
      {action && (
        action.href ? (
          <Button variant={action.variant || 'default'} onClick={() => window.location.href = action.href!}>
            {action.label}
          </Button>
        ) : (
          <Button variant={action.variant || 'default'} onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  )
}
