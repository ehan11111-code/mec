'use client'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import type { Decision } from '@/lib/mock/types'
import { Panel } from './Panel'
function formatTs(ts: string) { const d = new Date(ts); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` }
const OUTCOME_TONE: Record<string, string> = { cleared: 'bg-success-soft text-success', escalated: 'bg-accent-soft text-accent', rejected: 'bg-bg-soft text-muted', pending: 'bg-warn-soft text-warn' }
export function DecisionFeed({ decisions, locale, title, subtitle }: { decisions: Decision[]; locale: 'en' | 'ar'; title?: string; subtitle?: string }) {
  const t = useTranslations('outcome'); const tCommon = useTranslations('common')
  return (
    <Panel title={title} subtitle={subtitle} bodyClassName="px-0 pb-0" showRefresh>
      <ul className="divide-y divide-border">
        {decisions.map((d, i) => (
          <motion.li key={i} initial={{ opacity: 0, x: locale === 'ar' ? 8 : -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: i * 0.03 }}
            className="px-5 md:px-6 py-3.5 flex items-start gap-4">
            <span className="shrink-0 text-xs tabular-nums text-muted mt-0.5 w-12">{formatTs(d.ts)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text leading-snug">{d.text[locale]}</p>
              {d.confidence !== undefined && <p className="text-xs text-muted mt-0.5">{(d.confidence * 100).toFixed(0)}% {tCommon('confidence')}</p>}
            </div>
            <span className={clsx('shrink-0 inline-flex items-center text-[11px] font-medium rounded-full px-2.5 py-0.5', OUTCOME_TONE[d.outcome])}>{t(d.outcome)}</span>
          </motion.li>
        ))}
      </ul>
    </Panel>
  )
}
