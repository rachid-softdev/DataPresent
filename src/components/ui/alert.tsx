import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'

type AlertVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
}

const icons: Record<AlertVariant, React.FC<{ className?: string }>> = {
  default: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  info: Info,
}

const variantStyles: Record<AlertVariant, string> = {
  default: 'bg-muted/50 border-border text-foreground',
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300',
  info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300',
}

const iconColors: Record<AlertVariant, string> = {
  default: 'text-muted-foreground',
  success: 'text-green-500 dark:text-green-400',
  warning: 'text-yellow-500 dark:text-yellow-400',
  error: 'text-red-500 dark:text-red-400',
  info: 'text-blue-500 dark:text-blue-400',
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const Icon = icons[variant]
    
    return (
      <div
        ref={ref}
        className={cn(
          'border rounded-lg p-4 flex gap-3',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0', iconColors[variant])} />
        <div className="text-sm">{children}</div>
      </div>
    )
  }
)
Alert.displayName = 'Alert'

export const AlertTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('font-medium mb-1', className)} {...props} />
)
AlertTitle.displayName = 'AlertTitle'

export const AlertDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm opacity-90', className)} {...props} />
)
AlertDescription.displayName = 'AlertDescription'
