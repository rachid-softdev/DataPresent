'use client'

import Link from 'next/link'
import { Home, Search, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-background">
      <div className="text-center max-w-lg">
        {/* Animated 404 */}
        <div className="relative inline-block mb-6">
          <span className="text-[8rem] md:text-[10rem] font-bold text-primary leading-none select-none">
            404
          </span>
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-accent/20 rounded-full blur-xl animate-pulse" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse delay-1000" />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-3">
          Page non trouvée
        </h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-sm mx-auto">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>

        <div className="mb-8 flex justify-center">
          <div className="relative w-32 h-32">
            <div className="absolute inset-0 bg-muted rounded-2xl border-2 border-dashed border-border/50 rotate-3" />
            <div className="absolute inset-0 bg-muted/50 rounded-2xl border-2 border-dashed border-border/30 -rotate-2 flex items-center justify-center">
              <Search className="w-12 h-12 text-muted-foreground/50" />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium transition-colors hover:bg-primary/90 hover:scale-105"
          >
            <Home className="w-4 h-4" />
            Retour à l'accueil
          </Link>
          <Link
            href="javascript:history.back()"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface text-surface-foreground px-6 py-3 font-medium transition-colors hover:bg-muted hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4" />
            Page précédente
          </Link>
        </div>
      </div>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
    </div>
  )
}
