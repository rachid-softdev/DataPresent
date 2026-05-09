import { getRequestConfig } from 'next-intl/server'
 
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale
  
  return {
    locale: locale || 'fr',
    messages: (await import(`../messages/${locale || 'fr'}.json`)).default
  }
})