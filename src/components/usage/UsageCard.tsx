'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileText, Layers, Zap } from 'lucide-react'

interface UsageData {
  reportsUsed: number
  reportsLimit: number
  slidesUsed: number
  slidesLimit: number
  plan: string
}

export function UsageCard() {
  const t = useTranslations()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      try {
        const res = await fetch('/api/user/usage')
        if (res.ok) {
          const data = await res.json()
          setUsage(data)
        }
      } catch (error) {
        console.error('Failed to fetch usage:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsage()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!usage) {
    return null
  }

  const reportsPercentage = usage.reportsLimit > 0
    ? Math.min((usage.reportsUsed / usage.reportsLimit) * 100, 100)
    : 0

  const slidesPercentage = usage.slidesLimit > 0
    ? Math.min((usage.slidesUsed / usage.slidesLimit) * 100, 100)
    : 0

  const isUnlimited = usage.reportsLimit === -1

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          {t('settings.usage.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t('settings.usage.plan')}</span>
          <Badge variant={usage.plan === 'FREE' ? 'outline' : usage.plan === 'PRO' ? 'default' : 'secondary'}>
            {usage.plan}
          </Badge>
        </div>

        {/* Reports Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              {t('settings.usage.reports')}
            </span>
            <span className="text-muted-foreground">
              {isUnlimited ? (
                <span className="text-green-500">{t('settings.usage.unlimited')}</span>
              ) : (
                <>{usage.reportsUsed} / {usage.reportsLimit}</>
              )}
            </span>
          </div>
          {!isUnlimited && (
            <Progress value={reportsPercentage} className="h-2" />
          )}
        </div>

        {/* Slides Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              {t('settings.usage.slides')}
            </span>
            <span className="text-muted-foreground">
              {usage.slidesUsed} / {usage.slidesLimit}
            </span>
          </div>
          <Progress value={slidesPercentage} className="h-2" />
        </div>

        {/* Warning when close to limit */}
        {!isUnlimited && reportsPercentage >= 80 && (
          <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
            {t('settings.usage.warning', { percent: Math.round(reportsPercentage) })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}