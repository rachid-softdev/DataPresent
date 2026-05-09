'use client'
 
import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
 
export function LocaleSwitcher() {
  const t = useTranslations('common')
  const locale = useLocale()
  const router = useRouter()
 
  function onChange(value: string) {
    document.cookie = `NEXT_LOCALE=${value};path=/;max-age=31536000`
    router.refresh()
  }
 
  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value)}
      className="select select-sm select-bordered"
    >
      <option value="fr">Français</option>
      <option value="en">English</option>
    </select>
  )
}