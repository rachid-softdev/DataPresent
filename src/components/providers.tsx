'use client'

import { ThemeProvider } from './theme-provider'
import { Toaster } from 'sonner'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster position="top-right" richColors />
    </ThemeProvider>
  )
}
