'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { RestartOnboardingButton } from '@/components/onboarding/OnboardingTour'
import { HelpCircle } from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  image: string | null
}

export default function ProfilePage() {
  const t = useTranslations('settings')
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    fetch('/api/user/profile')
      .then(res => {
        if (res.status === 401) {
          router.push('/login')
          return null
        }
        return res.json()
      })
      .then(data => {
        if (data?.user) {
          setUser(data.user)
          setName(data.user.name || '')
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/user/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })

    if (res.ok) {
      const data = await res.json()
      setUser(data.user)
      toast.success(t('profile.update'))
    } else {
      toast.error(t('errors.generic'))
    }
    setSaving(false)
  }

  if (loading) {
    return <div className="p-8">{t('common.loading')}</div>
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">{t('profile.title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.title')}</CardTitle>
          <CardDescription>{t('profile.title')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar src={user?.image} fallback={user?.name || user?.email} className="w-20 h-20" />
            <div>
              <p className="font-medium">{user?.name || 'Sans nom'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t('profile.name')}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('profile.name')}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t('profile.email')}</label>
            <Input value={user?.email || ''} disabled className="bg-gray-50" />
            <p className="text-xs text-muted-foreground mt-1">{t('profile.email')}</p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            {t('profile.title')}
          </CardTitle>
          <CardDescription>
            {t('profile.title')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RestartOnboardingButton className="w-full" />
        </CardContent>
      </Card>
    </div>
  )
}