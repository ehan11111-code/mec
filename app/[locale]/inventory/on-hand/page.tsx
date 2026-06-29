'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { ClipboardList, FileText, ChevronDown, Loader2, TrendingUp } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { Sparkline } from '@/components/Sparkline'
import { fmtNum } from '@/lib/data/dataset'
import { fmtDate } from '@/lib/format/datetime'

type Statement = { message_id: string; asOf: string; received_at: string; total: number; items: { item: string; cartons: number }[]; hasFile: boolean }

export default function OnHandHistoryPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('inventory'); const locale = useLocale() as 'en' | 'ar'
  const [statements, setStatements] = useState<Statement[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/inventory-count/history', { cache: 'no-store' }).then(r => r.json())
      .then(d => setStatements(Array.isArray(d.statements) ? d.statements : [])).catch(() => setStatements([]))
  }, [])

  const latest = statements?.[0]
  // Totals oldest→newest for the trend sparkline.
  const trend = useMemo(() => (statements ? [...statements].reverse().map(s => s.total) : []), [statements])

  return (
    <PageShell requires="orders" breadcrumbs={[{ label: tNav('inventory') }, { label: t('onhandHistTitle') }]}>
      <header className="mb-7 max-w-3xl">
        <Eyebrow accent>{t('onhandHistEyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('onhandHistTitle')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('onhandHistSub')}</p>
      </header>

      <section className="mb-7 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('onhandHistLatest')} value={latest ? `${fmtNum(latest.total)}` : '—'} accent delta={t('onhandHistTrendSub')} index={0} />
        <StatCard label={t('onhandHistAsOf')} value={latest ? fmtDate(latest.asOf, locale) : '—'} index={1} />
        <StatCard label={t('onhandHistCount')} value={statements ? String(statements.length) : '—'} delta={t('onhandHistCountSub')} index={2} />
        <StatCard label={t('onhandHistItems')} value={latest ? String(latest.items.length) : '—'} delta={t('onhandHistItemsSub')} index={3} accent />
      </section>

      {trend.length > 1 && (
        <Panel className="mb-6" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('onhandHistTrend')}</span>} subtitle={t('onhandHistTrendSub')}>
          <div className="flex items-end gap-4">
            <Sparkline data={trend} accent />
            <span className="text-xs text-muted">{fmtNum(trend[0])} → {fmtNum(trend[trend.length - 1])} {t('cartons')}</span>
          </div>
        </Panel>
      )}

      <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('onhandHistTimeline')}</span>} subtitle={t('onhandHistTimelineSub')}>
        {statements === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
        ) : statements.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t('onhandHistEmpty')} hint={t('onhandHistEmptyHint')} source="WhatsApp · المخزون" />
        ) : (
          <ul className="divide-y divide-border">
            {statements.map((s, i) => {
              const isOpen = open === s.message_id
              return (
                <li key={s.message_id} className="px-5 md:px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setOpen(isOpen ? null : s.message_id)} className="flex flex-1 items-center gap-3 min-w-0 text-start">
                      <ChevronDown className={clsx('h-4 w-4 text-muted shrink-0 transition-transform', isOpen && 'rotate-180')} strokeWidth={1.8} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text">{fmtDate(s.asOf, locale)}{i === 0 && <span className="ms-2 text-[10px] rounded-full bg-accent-soft text-accent px-1.5 py-0.5">{t('onhandHistNewest')}</span>}</div>
                        <div className="text-[11px] text-muted">{t('onhandHistItemsN', { n: s.items.length })}</div>
                      </div>
                    </button>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-accent">{fmtNum(s.total)}</span>
                    {s.hasFile
                      ? <a href={`/api/wa-file?id=${encodeURIComponent(s.message_id)}`} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] text-text-soft hover:text-text hover:border-accent/40 transition-colors"><FileText className="h-3 w-3" strokeWidth={1.8} />{t('onhandHistOpen')}</a>
                      : <span className="shrink-0 text-[10px] text-muted">{t('onhandHistNoFile')}</span>}
                  </div>
                  {isOpen && (
                    <ul className="mt-2.5 ms-7 divide-y divide-border rounded-soft border border-border">
                      {s.items.map((it, j) => (
                        <li key={j} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                          <span className="text-text-soft truncate" dir="auto">{it.item}</span>
                          <span className="shrink-0 tabular-nums text-text font-medium">{fmtNum(it.cartons)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <NoteCallout className="mt-6" tone="info" title={t('onhandHistProofTitle')}>{t('onhandHistProofBody')}</NoteCallout>
    </PageShell>
  )
}
