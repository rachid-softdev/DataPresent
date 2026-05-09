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
  default: 'bg-gray-50 border-gray-200 text-gray-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
}

const iconColors: Record<AlertVariant, string> = {
  default: 'text-gray-500',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  info: 'text-blue-500',
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