'use client'

import { useTheme } from '@/components/theme-provider'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg cursor-pointer ${isDark ? 'bg-green-900' : 'bg-green-100'} hover:${isDark ? 'bg-green-800' : 'bg-green-200'} transition-colors ${className}`}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-green-300" />
      ) : (
        <Moon className="w-5 h-5 text-green-700" />
      )}
    </button>
  )
}
