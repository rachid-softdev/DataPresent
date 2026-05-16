import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface shadow-sm',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'
const MemoizedCard = React.memo(Card)
Object.defineProperty(MemoizedCard, 'displayName', { value: 'Card' })

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'
const MemoizedCardHeader = React.memo(CardHeader)
Object.defineProperty(MemoizedCardHeader, 'displayName', { value: 'CardHeader' })

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'
const MemoizedCardTitle = React.memo(CardTitle)
Object.defineProperty(MemoizedCardTitle, 'displayName', { value: 'CardTitle' })

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'
const MemoizedCardContent = React.memo(CardContent)
Object.defineProperty(MemoizedCardContent, 'displayName', { value: 'CardContent' })

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
)
CardDescription.displayName = 'CardDescription'
const MemoizedCardDescription = React.memo(CardDescription)
Object.defineProperty(MemoizedCardDescription, 'displayName', { value: 'CardDescription' })

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'
const MemoizedCardFooter = React.memo(CardFooter)
Object.defineProperty(MemoizedCardFooter, 'displayName', { value: 'CardFooter' })

export { MemoizedCard as Card, MemoizedCardHeader as CardHeader, MemoizedCardTitle as CardTitle, MemoizedCardContent as CardContent, MemoizedCardDescription as CardDescription, MemoizedCardFooter as CardFooter }