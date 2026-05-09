import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: 'DataPresent - Transformez vos données en présentations',
  description: 'Générez des présentations professionnelles à partir de vos fichiers Excel, CSV, PDF ou Google Sheets',
  keywords: ['Excel', 'présentation', 'IA', 'graphiques', 'PowerPoint', 'PDF', 'rapport', 'données'],
  authors: [{ name: 'DataPresent' }],
  creator: 'DataPresent',
  publisher: 'DataPresent',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://datapresent.com',
    siteName: 'DataPresent',
    title: 'DataPresent - Transformez vos données en présentations professionnelles',
    description: 'Générez des présentations professionnelles à partir de vos fichiers Excel, CSV, PDF ou Google Sheets grâce à l\'IA',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DataPresent - Générateur de présentations IA'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DataPresent - Transformez vos données en présentations',
    description: 'Générez des présentations professionnelles grâce à l\'IA',
    images: ['/og-image.png'],
    creator: '@datapresent'
  },
  alternates: {
    canonical: 'https://datapresent.com'
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} data-theme="light">
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            {children}
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}