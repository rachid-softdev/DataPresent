'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { User, Building2, Users, CreditCard, Shield, Key } from 'lucide-react'

const settingsNav = [
  {
    title: 'Mon compte',
    href: '/settings/profile',
    icon: User,
  },
  {
    title: 'Organisation',
    href: '/settings/organization',
    icon: Building2,
  },
  {
    title: 'Équipe',
    href: '/settings/team',
    icon: Users,
  },
  {
    title: 'Abonnement',
    href: '/settings/billing',
    icon: CreditCard,
  },
  {
    title: 'API Keys',
    href: '/settings/api-keys',
    icon: Key,
  },
  {
    title: 'Sécurité',
    href: '/settings/account',
    icon: Shield,
  },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex gap-8">
      <aside className="w-64 flex-shrink-0">
        <nav className="space-y-1">
          {settingsNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  )
}