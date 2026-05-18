'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { useParams } from 'next/navigation'

export function BlogHeader() {
  const t = useTranslations('nav')
  const params = useParams()
  const locale = params.locale as string

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <nav className="flex justify-between items-center">
          {/* Logo */}
          <Link href={`/${locale}`} className="text-xl font-bold text-primary">
            DataPresent
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/blog`} className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
              {t('blog')}
            </Link>
            <Link href={`/${locale}/login`}>
              <Button variant="ghost" size="sm">{t('login')}</Button>
            </Link>
            <Link href={`/${locale}/signup`}>
              <Button size="sm">{t('signup')}</Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}