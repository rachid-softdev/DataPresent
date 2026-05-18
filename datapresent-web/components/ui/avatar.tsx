import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
}

export const Avatar = React.memo(React.forwardRef<HTMLDivElement, AvatarProps>(
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
          <Image
            src={src}
            alt={alt || 'Avatar'}
            fill
            sizes="(max-width: 40px) 100vw, 40px"
            className="object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <span className="text-sm font-medium text-primary">
            {fallback?.charAt(0).toUpperCase() || '?'}
          </span>
        )}
      </div>
    )
  }
))
Avatar.displayName = 'Avatar'

export const AvatarImage = React.memo(({ src, alt }: { src?: string; alt?: string }) => {
  const [error, setError] = React.useState(false)
  if (error || !src) return null
  return (
    <Image
      src={src}
      alt={alt || 'Avatar'}
      fill
      sizes="(max-width: 40px) 100vw, 40px"
      className="object-cover"
      onError={() => setError(true)}
    />
  )
})
AvatarImage.displayName = 'AvatarImage'

export const AvatarFallback = ({ children }: { children?: React.ReactNode }) => (
  <span className="text-sm font-medium text-primary">{children}</span>
)