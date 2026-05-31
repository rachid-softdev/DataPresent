'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from './OrgSwitcher'
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTranslations } from 'next-intl'
import { Menu, X } from 'lucide-react'

export function DashboardNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const links = [
    { href: '/new', label: t('newReport') },
    { href: '/reports', label: t('reports') },
    { href: '/templates', label: t('templates') },
    { href: '/settings/profile', label: t('settings') },
  ]

  const closeMenu = () => setMobileMenuOpen(false)

  return (
    <header className="app-nav">
      <div className="max-w-7xl mx-auto px-4 app-nav-inner">
        <div className="flex items-center gap-4">
          <Link href="/" className="app-logo">
            <div className="app-logo-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M3 3v18h18" />
                <path d="M7 16l4-8 4 4 4-6" />
              </svg>
            </div>
            <span className="app-logo-text">DataPresent</span>
          </Link>
          <OrgSwitcher />
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-2">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'app-nav-link',
                  (pathname === link.href || pathname.startsWith(link.href + '/')) && 'active'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden lg:block app-nav-divider" />
          <LocaleSwitcher />
          <ThemeToggle />
          {/* Hamburger button — visible below lg */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border">
          <nav className="max-w-7xl mx-auto px-4 py-3 space-y-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={cn(
                  'block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  (pathname === link.href || pathname.startsWith(link.href + '/'))
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
