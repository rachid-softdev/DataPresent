'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from '@/components/theme-provider'
import Link from 'next/link'
import { Sparkles, Palette, Download } from 'lucide-react'

export default function RootPage() {
  const t = useTranslations('landing')
  const nav = useTranslations('nav')
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const bgClass = isDark ? 'bg-[#0c1407]' : 'bg-[#f1f8ec]'
  const headerBorderClass = isDark ? 'border-[#2d4a1f]' : 'border-[#c5d9b3]'
  const textClass = isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'
  const logoClass = isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'
  const ghostButtonClass = isDark ? 'text-[#e3f1db] hover:bg-[#2d4a1f]/20' : 'text-[#17250e] hover:bg-[#c5d9b3]/20'
  const primaryButtonClass = isDark ? 'bg-[#afdf95] text-[#0c1407] hover:bg-[#478524]' : 'bg-[#3a6a20] text-white hover:bg-[#478524]'
  const secondaryButtonClass = isDark ? 'bg-[#2d4a1f] text-[#e3f1db] hover:bg-[#478524]' : 'bg-[#c5d9b3] text-[#17250e] hover:bg-[#478524]'
  const mutedTextClass = isDark ? 'text-[#e3f1db] opacity-70' : 'text-[#17250e] opacity-70'
  const featuresBgClass = isDark ? 'bg-[#2d4a1f]/10' : 'bg-[#c5d9b3]/30'
  const cardClass = isDark ? 'bg-[#0c1407] border-[#2d4a1f]' : 'bg-white border-[#c5d9b3]'
  const iconClass = isDark ? 'text-[#afdf95]' : 'text-[#3a6a20]'
  const priceClass = isDark ? 'text-[#afdf95]' : 'text-[#3a6a20]'
  const proCardClass = isDark ? 'bg-[#0c1407] border-[#afdf95]' : 'bg-white border-[#3a6a20]'
  const footerBorderClass = isDark ? 'border-[#2d4a1f]' : 'border-[#c5d9b3]'

  return (
    <div className={'min-h-screen flex flex-col ' + bgClass}>
      <header className={'border-b ' + headerBorderClass}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className={'text-2xl font-bold ' + logoClass}>DataPresent</div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <button className={'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ' + ghostButtonClass}>
                {nav('login')}
              </button>
            </Link>
            <Link href="/signup">
              <button className={'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ' + primaryButtonClass}>
                {nav('signup')}
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className={'text-5xl font-bold mb-6 ' + textClass}>{t('hero.title')}</h1>
            <p className={'text-xl mb-8 ' + mutedTextClass}>{t('hero.subtitle')}</p>
            <Link href="/signup">
              <button className={'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-12 px-8 text-lg ' + primaryButtonClass}>
                {t('hero.cta')}
              </button>
            </Link>
          </div>
        </section>

        <section className={'py-20 px-6 ' + featuresBgClass}>
          <div className="max-w-6xl mx-auto">
            <h2 className={'text-3xl font-bold text-center mb-12 ' + textClass}>{t('features.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className={'p-6 rounded-lg border ' + cardClass}>
                <Sparkles className={'w-10 h-10 mb-4 ' + iconClass} />
                <h3 className={'text-xl font-semibold mb-2 ' + textClass}>{t('features.ai')}</h3>
                <p className={mutedTextClass}>{t('features.aiDesc')}</p>
              </div>
              <div className={'p-6 rounded-lg border ' + cardClass}>
                <Palette className={'w-10 h-10 mb-4 ' + iconClass} />
                <h3 className={'text-xl font-semibold mb-2 ' + textClass}>{t('features.templates')}</h3>
                <p className={mutedTextClass}>{t('features.templatesDesc')}</p>
              </div>
              <div className={'p-6 rounded-lg border ' + cardClass}>
                <Download className={'w-10 h-10 mb-4 ' + iconClass} />
                <h3 className={'text-xl font-semibold mb-2 ' + textClass}>{t('features.export')}</h3>
                <p className={mutedTextClass}>{t('features.exportDesc')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className={'text-3xl font-bold mb-8 ' + textClass}>{t('pricing.title')}</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className={'p-6 rounded-lg border ' + cardClass}>
                <h3 className={'text-xl font-semibold mb-4 ' + textClass}>{t('pricing.free')}</h3>
                <p className={'text-3xl font-bold mb-4 ' + priceClass}>0€<span className="text-sm font-normal">{t('pricing.perMonth')}</span></p>
                <Link href="/signup">
                  <button className={'w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ' + secondaryButtonClass}>
                    {t('pricing.getStarted')}
                  </button>
                </Link>
              </div>
              <div className={'p-6 rounded-lg border-2 ' + proCardClass}>
                <h3 className={'text-xl font-semibold mb-4 ' + textClass}>{t('pricing.pro')}</h3>
                <p className={'text-3xl font-bold mb-4 ' + priceClass}>19€<span className="text-sm font-normal">{t('pricing.perMonth')}</span></p>
                <Link href="/signup">
                  <button className={'w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ' + primaryButtonClass}>
                    {t('pricing.getStarted')}
                  </button>
                </Link>
              </div>
              <div className={'p-6 rounded-lg border ' + cardClass}>
                <h3 className={'text-xl font-semibold mb-4 ' + textClass}>{t('pricing.enterprise')}</h3>
                <p className={'text-3xl font-bold mb-4 ' + priceClass}>49€<span className="text-sm font-normal">{t('pricing.perMonth')}</span></p>
                <Link href="/signup">
                  <button className={'w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ' + secondaryButtonClass}>
                    {t('pricing.getStarted')}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={'border-t py-12 px-6 ' + footerBorderClass}>
        <div className={'max-w-7xl mx-auto text-center ' + mutedTextClass}>
          <p>© 2025 DataPresent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}