'use client'

import Link from 'next/link'
import { useTheme } from '@/components/theme-provider'

export default function NotFound() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center px-4 py-12 ${isDark ? 'bg-[#0c1407]' : 'bg-[#f1f8ec]'}`}>
      <div className="text-center max-w-md">
        <div className={`text-9xl font-bold ${isDark ? 'text-[#2d4a1f]' : 'text-[#c5d9b3]'}`}>404</div>
        <h1 className={`mt-4 text-2xl font-bold tracking-tight ${isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'}`}>
          Page non trouvée
        </h1>
        <p className={`mt-2 ${isDark ? 'text-[#e3f1db] opacity-70' : 'text-[#17250e] opacity-70'}`}>
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link href="/" className={`mt-6 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ${isDark ? 'bg-[#afdf95] text-[#0c1407] hover:bg-[#478524]' : 'bg-[#3a6a20] text-white hover:bg-[#478524]'}`}>
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}