import * as React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, ...props }, ref) => {
    const [error, setError] = React.useState(false)
    
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 overflow-hidden',
          className
        )}
        {...props}
      >
        {!error && src ? (
          <img
            src={src}
            alt={alt}
            onError={() => setError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-sm font-medium text-primary">
            {fallback?.charAt(0).toUpperCase() || '?'}
          </span>
        )}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'

export const AvatarImage = ({ src, alt }: { src?: string; alt?: string }) => {
  const [error, setError] = React.useState(false)
  if (error || !src) return null
  return <img src={src} alt={alt} onError={() => setError(true)} className="h-full w-full object-cover" />
}

export const AvatarFallback = ({ children }: { children?: React.ReactNode }) => (
  <span className="text-sm font-medium text-primary">{children}</span>
)