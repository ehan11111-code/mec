'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { AlertOctagon, X, ChevronRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { getConcerns, type Concern } from '@/lib/data/concerns'

const tone: Record<string, string> = {
  high: 'border-accent/40 bg-accent-soft text-accent', medium: 'border-warn/40 bg-warn-soft text-warn',
  low: 'border-border bg-bg-soft text-text-soft', info: 'border-border bg-bg-soft text-muted'
}

// Notification bar that surfaces data contradictions/concerns. Computed client-side from the dataset;
// dismissible per session.
export function ConcernsBar() {
  const t = useTranslations('concerns'); const locale = useLocale() as 'en' | 'ar'
  const [concerns, setConcerns] = useState<Concern[] | null>(null)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    setConcerns(getConcerns())
    try { setDismissed(sessionStorage.getItem('concerns_dismissed') === '1') } catch { /* ignore */ }
  }, [])
  if (!concerns || concerns.length === 0 || dismissed) return null
  const top = concerns[0]
  const dismiss = () => { setDismissed(true); try { sessionStorage.setItem('concerns_dismissed', '1') } catch { /* ignore */ } }

  return (
    <div className={clsx('mb-6 rounded-soft border px-4 py-3 flex items-start gap-3 print:hidden', tone[top.severity])}>
      <AlertOctagon className="h-5 w-5 mt-0.5 shrink-0" strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-text">{t('title', { n: concerns.length })}</span>
          <span className="text-[11px] rounded-full bg-surface/70 border border-border px-2 py-0.5 text-text-soft">{top.title[locale]}</span>
        </div>
        <p className="text-xs text-text-soft mt-1 leading-relaxed line-clamp-2">{top.detail[locale]}</p>
        <p className="text-[11px] text-muted mt-1 leading-relaxed italic line-clamp-2"><span className="font-medium not-italic">{t('likelyCause')}:</span> {top.conclusion[locale]}</p>
        <Link href="/notifications" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
          {t('viewAll')}<ChevronRight className="h-3.5 w-3.5 flip-rtl" strokeWidth={1.9} />
        </Link>
      </div>
      <button type="button" onClick={dismiss} aria-label={t('dismiss')} className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-surface/60 text-muted transition-colors">
        <X className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  )
}
