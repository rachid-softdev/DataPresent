'use client'

import Link from 'next/link'
import { useTheme } from '@/components/theme-provider'

export default function NotFound() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const bgClass = isDark ? 'bg-[#0c1407]' : 'bg-[#f1f8ec]'
  const textClass = isDark ? 'text-[#2d4a1f]' : 'text-[#c5d9b3]'
  const titleClass = isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'
  const mutedTextClass = isDark ? 'text-[#e3f1db] opacity-70' : 'text-[#17250e] opacity-70'
  const buttonClass = isDark ? 'bg-[#afdf95] text-[#0c1407] hover:bg-[#478524]' : 'bg-[#3a6a20] text-white hover:bg-[#478524]'

  return (
    <div className={'flex min-h-screen flex-col items-center justify-center px-4 py-12 ' + bgClass}>
      <div className="text-center max-w-md">
        <div className={'text-9xl font-bold ' + textClass}>404</div>
        <h1 className={'mt-4 text-2xl font-bold tracking-tight ' + titleClass}>
          Page non trouvée
        </h1>
        <p className={'mt-2 ' + mutedTextClass}>
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link href="/" className={'mt-6 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ' + buttonClass}>
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}