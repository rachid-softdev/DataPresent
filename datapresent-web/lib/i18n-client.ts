'use client'

import { useTranslations } from 'next-intl'

export function useApiTranslations() {
  const t = useTranslations()

  function translateError(error: string): string {
    if (error.startsWith('errors.')) {
      return t(error) || error
    }
    return t(`errors.generic`)
  }

  function translateMessage(message: string): string {
    if (message.startsWith('messages.')) {
      return t(message) || message
    }
    return message
  }

  return { translateError, translateMessage, t }
}