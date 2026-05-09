'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Palette, Download, Sparkles } from 'lucide-react'

export default function LandingPage() {
  const t = useTranslations('landing')

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold">DataPresent</div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">{t('nav.login')}</Button>
            </Link>
            <Link href="/signup">
              <Button>{t('nav.signup')}</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">{t('hero.title')}</h1>
            <p className="text-xl text-muted-foreground mb-8">{t('hero.subtitle')}</p>
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">{t('hero.cta')}</Button>
            </Link>
          </div>
        </section>

        <section className="py-20 px-6 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{t('features.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Sparkles className="w-10 h-10 mb-2 text-primary" />
                  <CardTitle>{t('features.ai')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('features.aiDesc')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Palette className="w-10 h-10 mb-2 text-primary" />
                  <CardTitle>{t('features.templates')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('features.templatesDesc')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Download className="w-10 h-10 mb-2 text-primary" />
                  <CardTitle>{t('features.export')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('features.exportDesc')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">{t('pricing.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle>{t('pricing.free')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold mb-4">0€<span className="text-sm font-normal">{t('pricing.perMonth')}</span></p>
                  <Link href="/signup">
                    <Button className="w-full">{t('pricing.getStarted')}</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle>{t('pricing.pro')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold mb-4">19€<span className="text-sm font-normal">{t('pricing.perMonth')}</span></p>
                  <Link href="/signup">
                    <Button className="w-full">{t('pricing.getStarted')}</Button>
                  </Link>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('pricing.enterprise')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold mb-4">49€<span className="text-sm font-normal">{t('pricing.perMonth')}</span></p>
                  <Link href="/signup">
                    <Button className="w-full">{t('pricing.getStarted')}</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 px-6">
        <div className="max-w-7xl mx-auto text-center text-muted-foreground">
          <p>© 2025 DataPresent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}