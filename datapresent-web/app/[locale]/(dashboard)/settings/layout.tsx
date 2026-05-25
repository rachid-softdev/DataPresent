'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { User, Building2, Users, CreditCard, Key, Shield } from 'lucide-react'

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
      <aside className="app-sidebar">
        <nav className="space-y-1">
          {settingsNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'app-sidebar-link',
                  isActive && 'active'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
