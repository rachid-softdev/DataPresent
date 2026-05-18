'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const Dialog = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      className
    )}
    {...props}
  />
))
Dialog.displayName = 'Dialog'

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn('cursor-pointer', className)}
    {...props}
  />
))
DialogTrigger.displayName = 'DialogTrigger'

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <div className="fixed inset-0 bg-black/50" />
    <div
      ref={ref}
      className={cn(
        'relative z-50 w-full max-w-lg bg-surface border border-border rounded-lg shadow-lg p-6',
        className
      )}
      {...props}
    >
      {children}
      <button
        className="absolute top-4 right-4 p-1 rounded hover:bg-muted transition-colors"
        onClick={(e) => {
          const closestDialog = e.currentTarget.closest('[role="dialog"]')
          if (closestDialog) {
            const closeButton = closestDialog.querySelector('[data-close]') as HTMLButtonElement
            closeButton?.click()
          }
        }}
        aria-label="Fermer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  </div>
))
DialogContent.displayName = 'DialogContent'

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-4', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-sm text-muted-foreground mt-1', className)} {...props} />
)
DialogDescription.displayName = 'DialogDescription'

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-6 flex justify-end gap-2', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}
