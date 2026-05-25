'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="text-center max-w-lg">
          <div className="relative inline-block mb-6">
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-destructive animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-destructive/20 rounded-full blur-xl animate-pulse" />
          </div>

          <h1 className="app-heading app-heading-xl mb-3">
            Une erreur est survenue
          </h1>
          <p className="text-muted-foreground text-lg mb-4 max-w-sm mx-auto">
            Désolé, une erreur inattendue s&apos;est produite. Veuillez réessayer.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-muted rounded-xl text-left text-sm overflow-auto max-h-32 border border-border">
              <p className="font-mono text-destructive break-words">
                {error.message || 'Unknown error'}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="app-btn app-btn-primary app-btn-lg"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
            <Link
              href="/"
              className="app-btn app-btn-outline app-btn-lg"
            >
              <Home className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
          </div>
        </div>

        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-destructive/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        </div>
      </main>

      <Footer />
    </div>
  )
}
