import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent', className)} />
  )
}