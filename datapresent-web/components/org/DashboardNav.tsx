'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from './OrgSwitcher'
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useTranslations } from 'next-intl'

export function DashboardNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const links = [
    { href: '/new', label: t('newReport') },
    { href: '/reports', label: t('reports') },
    { href: '/templates', label: t('templates') },
    { href: '/settings/profile', label: t('settings') },
  ]

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
          <nav className="app-nav-links">
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
          <div className="app-nav-divider" />
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
