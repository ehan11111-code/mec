'use client'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
export function LocaleToggle() {
  const locale = useLocale() as 'en' | 'ar'
  const pathname = usePathname(); const router = useRouter()
  const next = locale === 'en' ? 'ar' : 'en'
  return (
    <button type="button" onClick={() => router.replace(pathname, { locale: next })} aria-label="Switch language"
      className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-elev transition-colors text-xs font-medium text-text-soft">
      {locale === 'en' ? 'ع' : 'EN'}
    </button>
  )
}
