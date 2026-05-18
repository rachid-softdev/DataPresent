'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Share2, Check, Link2 } from 'lucide-react'

interface ShareButtonProps {
  title: string
  locale: string
}

export function ShareButton({ title, locale }: ShareButtonProps) {
  const t = useTranslations('blog')
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = `${window.location.origin}/${locale}/blog/${window.location.pathname.split('/').pop()}`

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShare}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          {t('linkCopied')}
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4" />
          {t('share')}
        </>
      )}
    </Button>
  )
}