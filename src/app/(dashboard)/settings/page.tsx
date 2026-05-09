'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLANS } from '@/lib/plans'
import { User, Building2, Users, CreditCard, Shield, TrendingUp, FileText, ArrowRight } from 'lucide-react'

interface UsageStats {
  reports: {
    used: number
    limit: number
    remaining: number
  }
  plan: string
  members: number
}

export default function SettingsIndexPage() {
  const t = useTranslations('settings')
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/user/usage')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const sections = [
    {
      title: t('profile.title'),
      description: t('profile.title'),
      href: '/settings/profile',
      icon: User,
    },
    {
      title: t('organization.title'),
      description: t('organization.title'),
      href: '/settings/organization',
      icon: Building2,
    },
    {
      title: t('team.title'),
      description: t('team.title'),
      href: '/settings/team',
      icon: Users,
      badge: stats?.members ? `${stats.members}` : undefined,
    },
    {
      title: t('billing.title'),
      description: t('billing.title'),
      href: '/settings/billing',
      icon: CreditCard,
      badge: stats?.plan ? PLANS[stats.plan as keyof typeof PLANS]?.name : undefined,
    },
    {
      title: t('account.title'),
      description: t('account.title'),
      href: '/settings/account',
      icon: Shield,
    },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

      {!loading && stats && (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t('billing.plan')}</CardDescription>
              <CardTitle className="text-2xl">{PLANS[stats.plan as keyof typeof PLANS]?.name || 'Free'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                {stats.reports.limit === -1 ? t('billing.features.reports') : `${stats.reports.remaining}`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t('billing.usage.reports')}</CardDescription>
              <CardTitle className="text-2xl">{stats.reports.used}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                {stats.reports.limit === -1 ? '∞' : `${stats.reports.limit}`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>{t('team.members')}</CardDescription>
              <CardTitle className="text-2xl">{stats.members}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <Link href="/settings/team" className="hover:underline">{t('team.title')}</Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <section.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      {section.badge && (
                        <Badge variant="outline">{section.badge}</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1">{section.description}</CardDescription>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}