'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">Une erreur est survenue</h2>
      <p className="text-gray-500 mb-6">Désolé, quelque chose s'est mal passé.</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  )
}