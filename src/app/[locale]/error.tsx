'use client'

import { useEffect } from 'react'
import { useTheme } from '@/components/theme-provider'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    console.error(error)
  }, [error])

  const bgClass = isDark ? 'bg-[#0c1407]' : 'bg-[#f1f8ec]'
  const textClass = isDark ? 'text-[#2d4a1f]' : 'text-[#c5d9b3]'
  const titleClass = isDark ? 'text-[#e3f1db]' : 'text-[#17250e]'
  const mutedTextClass = isDark ? 'text-[#e3f1db] opacity-70' : 'text-[#17250e] opacity-70'
  const primaryButtonClass = isDark ? 'bg-[#afdf95] text-[#0c1407] hover:bg-[#478524]' : 'bg-[#3a6a20] text-white hover:bg-[#478524]'
  const secondaryButtonClass = isDark ? 'bg-[#2d4a1f] text-[#e3f1db] hover:bg-[#478524]' : 'bg-[#c5d9b3] text-[#17250e] hover:bg-[#478524]'
  const iconClass = isDark ? 'text-[#afdf95]' : 'text-[#3a6a20]'

  return (
    <div className={'flex min-h-screen flex-col items-center justify-center px-4 py-12 ' + bgClass}>
      <div className="text-center max-w-md">
        <AlertCircle className={'w-16 h-16 mx-auto mb-4 ' + iconClass} />
        <h1 className={'mt-4 text-2xl font-bold tracking-tight ' + titleClass}>
          Une erreur est survenue
        </h1>
        <p className={'mt-2 ' + mutedTextClass}>
          Désolé, une erreur inattendue s'est produite. Veuillez réessayer ou retourner à l'accueil.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={reset}
            className={'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ' + primaryButtonClass}
          >
            Réessayer
          </button>
          <Link href="/" className={'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2 ' + secondaryButtonClass}>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
