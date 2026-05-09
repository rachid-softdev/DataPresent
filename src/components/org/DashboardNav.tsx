'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from './OrgSwitcher'
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher'

export function DashboardNav() {
  const pathname = usePathname()

  const links = [
    { href: '/new', label: 'Nouveau' },
    { href: '/reports', label: 'Rapports' },
    { href: '/templates', label: 'Modèles' },
    { href: '/settings/profile', label: 'Paramètres' },
  ]

  return (
    <header className="bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-primary">
            DataPresent
          </Link>
          <OrgSwitcher />
        </div>
        <nav className="flex items-center gap-4">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm text-muted-foreground hover:text-foreground transition-colors',
                pathname === link.href && 'text-foreground font-medium'
              )}
            >
              {link.label}
            </Link>
          ))}
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  )
}