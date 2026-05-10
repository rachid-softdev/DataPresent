import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { Providers } from '@/components/providers'

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <Providers>
        {children}
      </Providers>
    </NextIntlClientProvider>
  )
}
