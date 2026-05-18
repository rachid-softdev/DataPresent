import { redirect } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { auth } from '@/lib/auth'
import { DashboardWithOnboarding } from '@/components/onboarding/DashboardWithOnboarding'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session) {
    redirect('/login')
  }

  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <DashboardWithOnboarding>{children}</DashboardWithOnboarding>
    </NextIntlClientProvider>
  )
}