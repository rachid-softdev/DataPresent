'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface HeaderProps {
  hideAuth?: boolean
}

export function Header({ hideAuth = false }: HeaderProps) {
  const [nav, setNav] = useState<{ login: string; signup: string } | null>(null)

  useEffect(() => {
    import('next-intl')
      .then((mod) => {
        try {
          const t = mod.useTranslations('nav')
          setNav({ login: t('login'), signup: t('signup') })
        } catch {
          setNav({ login: 'Connexion', signup: 'Inscription' })
        }
      })
      .catch(() => {
        setNav({ login: 'Connexion', signup: 'Inscription' })
      })
  }, [])

  const texts = nav || { login: 'Connexion', signup: 'Inscription' }

  return (
    <header className="app-nav">
      <div className="max-w-7xl mx-auto px-6 app-nav-inner">
        <Link href="/" className="app-logo">
          <div className="app-logo-mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M3 3v18h18" />
              <path d="M7 16l4-8 4 4 4-6" />
            </svg>
          </div>
          <span className="app-logo-text">DataPresent</span>
        </Link>
        {!hideAuth && (
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="app-btn app-btn-ghost app-btn-sm">
              {texts.login}
            </Link>
            <Link href="/signup" className="app-btn app-btn-primary app-btn-sm">
              {texts.signup}
            </Link>
          </div>
        )}
        {hideAuth && <ThemeToggle />}
      </div>
    </header>
  )
}
