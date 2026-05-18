'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  hideAuth?: boolean
}

export function Header({ hideAuth = false }: HeaderProps) {
  const [nav, setNav] = useState<{ login: string; signup: string } | null>(null)

  useEffect(() => {
    // Try to get translations on client side only
    import('next-intl')
      .then((mod) => {
        try {
          const t = mod.useTranslations('nav')
          setNav({ login: t('login'), signup: t('signup') })
        } catch {
          // Translations not available (e.g., in error pages)
          setNav({ login: 'Connexion', signup: 'Inscription' })
        }
      })
      .catch(() => {
        setNav({ login: 'Connexion', signup: 'Inscription' })
      })
  }, [])

  const texts = nav || { login: 'Connexion', signup: 'Inscription' }

  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-2xl font-bold text-primary hover:scale-105 transition-transform"
        >
          DataPresent
        </Link>
        {!hideAuth && (
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">{texts.login}</Button>
            </Link>
            <Link href="/signup">
              <Button>{texts.signup}</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
