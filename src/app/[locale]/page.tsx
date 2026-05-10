'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Sparkles, Palette, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RootPage() {
  const t = useTranslations('landing')
  const nav = useTranslations('nav')

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-primary">DataPresent</div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">{nav('login')}</Button>
            </Link>
            <Link href="/signup">
              <Button>{nav('signup')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
              {t('hero.title')}
            </h1>
            <p className="text-lg md:text-xl mb-8 text-muted-foreground">
              {t('hero.subtitle')}
            </p>
            <Link href="/signup">
              <Button size="lg" className="text-lg h-12 px-8">
                {t('hero.cta')}
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 md:py-20 px-6 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
              {t('features.title')}
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Sparkles className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <CardTitle className="text-xl mb-2">{t('features.ai')}</CardTitle>
                  <CardDescription>{t('features.aiDesc')}</CardDescription>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Palette className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <CardTitle className="text-xl mb-2">{t('features.templates')}</CardTitle>
                  <CardDescription>{t('features.templatesDesc')}</CardDescription>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Download className="w-10 h-10 mx-auto mb-4 text-primary" />
                  <CardTitle className="text-xl mb-2">{t('features.export')}</CardTitle>
                  <CardDescription>{t('features.exportDesc')}</CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 md:py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8 text-foreground">
              {t('pricing.title')}
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
              {/* Free */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('pricing.free')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold mb-4 text-primary">
                    0€<span className="text-sm font-normal text-muted-foreground">{t('pricing.perMonth')}</span>
                  </p>
                  <Link href="/signup">
                    <Button variant="outline" className="w-full">{t('pricing.getStarted')}</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Pro */}
              <Card className="border-primary shadow-lg scale-[1.02] relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  Populaire
                </div>
                <CardHeader>
                  <CardTitle>{t('pricing.pro')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold mb-4 text-primary">
                    19€<span className="text-sm font-normal text-muted-foreground">{t('pricing.perMonth')}</span>
                  </p>
                  <Link href="/signup">
                    <Button className="w-full">{t('pricing.getStarted')}</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('pricing.enterprise')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold mb-4 text-primary">
                    49€<span className="text-sm font-normal text-muted-foreground">{t('pricing.perMonth')}</span>
                  </p>
                  <Link href="/signup">
                    <Button variant="outline" className="w-full">{t('pricing.getStarted')}</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>© 2025 DataPresent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
