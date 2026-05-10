'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

export default function AccountPage() {
  const router = useRouter()
  const t = useTranslations('settings')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' })
  }

  const handleDeleteAccount = async () => {
    const res = await fetch('/api/user', { method: 'DELETE' })
    
    if (res.ok) {
      toast.success(t('account.delete'))
      await signOut({ callbackUrl: '/' })
    } else {
      toast.error(t('errors.generic'))
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">{t('account.title')}</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('nav.logout')}</CardTitle>
            <CardDescription>{t('nav.logout')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleSignOut}>
              {t('nav.logout')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('account.delete')}</CardTitle>
            <CardDescription>{t('account.deleteDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="error">
              <AlertDescription>
                {t('account.confirmDelete')}
              </AlertDescription>
            </Alert>
            <Button variant="destructive" className="mt-4" onClick={() => setShowDeleteConfirm(true)}>
              {t('account.delete')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('account.delete')}
        description={t('account.confirmDelete')}
        confirmLabel={t('account.delete')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
