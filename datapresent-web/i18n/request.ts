import { getRequestConfig } from 'next-intl/server'
import enMessages from '../messages/en.json'
import frMessages from '../messages/fr.json'

const messagesMap = {
  en: enMessages,
  fr: frMessages,
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale
  const resolved = (locale as string) || 'fr'

  return {
    locale: resolved,
    messages: messagesMap[resolved as keyof typeof messagesMap] || frMessages,
  }
})
