'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-sm border w-full max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Erreur d'authentification</h2>
        <p className="text-gray-500 mb-6">Une erreur s'est produite lors de la connexion.</p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Réessayer</Button>
          <Link href="/login">
            <Button variant="outline">Retour à la connexion</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}