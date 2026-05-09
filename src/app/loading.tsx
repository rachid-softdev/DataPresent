'use client'

import { useTheme } from '@/components/theme-provider'

export default function Loading() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className={`flex min-h-screen items-center justify-center ${isDark ? 'bg-[#0c1407]' : 'bg-[#f1f8ec]'}`}>
      <div className="flex flex-col items-center gap-4">
        <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${isDark ? 'border-[#afdf95] border-t-transparent' : 'border-[#3a6a20] border-t-transparent'}`} />
        <p className={`text-sm ${isDark ? 'text-[#e3f1db] opacity-70' : 'text-[#17250e] opacity-70'}`}>Chargement...</p>
      </div>
    </div>
  )
}