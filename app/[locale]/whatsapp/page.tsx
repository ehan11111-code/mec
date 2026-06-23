'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { MessageCircle, BadgeCheck, Loader2 } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import type { WhatsappMsg } from '@/lib/data/supply'

const INTENT: Record<string, string> = {
  order: 'bg-success-soft text-success',
  inquiry: 'bg-warn-soft text-warn',
  complaint: 'bg-accent-soft text-accent',
  other: 'bg-bg-soft text-muted'
}

export default function WhatsappPage() {
  const t = useTranslations('whatsapp'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en' | 'ar'
  const [msgs, setMsgs] = useState<WhatsappMsg[] | null>(null)

  useEffect(() => {
    fetch('/api/whatsapp').then(r => r.json()).then(d => setMsgs(Array.isArray(d) ? d : [])).catch(() => setMsgs([]))
  }, [])

  const list = msgs ?? []
  const orders = list.filter(m => m.intent === 'order').length
  const inquiries = list.filter(m => m.intent === 'inquiry').length
  const fmt = (s: string, opts: Intl.DateTimeFormatOptions) => { try { return new Date(s).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', opts) } catch { return '—' } }

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('whatsapp') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      <section className="mb-8 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kTotal')} value={msgs ? String(list.length) : '—'} infoId="waMessages" index={0} accent />
        <StatCard label={t('kOrders')} value={msgs ? String(orders) : '—'} infoId="waOrders" index={1} />
        <StatCard label={t('kInquiries')} value={msgs ? String(inquiries) : '—'} index={2} />
        <StatCard label={t('kLatest')} value={list[0] ? fmt(list[0].received_at, { dateStyle: 'short', timeStyle: 'short' }) : '—'} index={3} />
      </section>

      <Panel title={t('inbox')} bodyClassName="px-0 pb-0">
        {msgs === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />…</div>
        ) : list.length === 0 ? (
          <EmptyState icon={MessageCircle} title={t('emptyTitle')} hint={t('emptyHint')} source={t('source')} />
        ) : (
          <ul className="divide-y divide-border">
            {list.map(m => (
              <li key={m.message_id} className="px-5 md:px-6 py-3.5 hover:bg-surface-elev transition-colors">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-8 w-8 rounded-full bg-accent-soft text-accent text-xs font-semibold">
                    {(m.push_name || m.phone || '?').slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text truncate">{m.push_name || m.phone}</span>
                      <span className="text-[11px] text-muted tabular-nums">{m.phone}</span>
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize', INTENT[m.intent] || INTENT.other)}>{t(`intent_${m.intent}`)}</span>
                      {m.verified && <BadgeCheck className="h-3.5 w-3.5 text-success" strokeWidth={1.8} />}
                    </div>
                    <p className="mt-1 text-sm text-text-soft leading-snug break-words">{m.body || <span className="text-muted italic">{t(`type_${m.message_type}`)}</span>}</p>
                    {m.products?.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.products.map((p, i) => (
                          <span key={i} className="inline-flex items-center rounded-md bg-bg-soft px-2 py-0.5 text-[11px] text-text-soft">
                            {p.name}{p.qty ? ` · ${p.qty}${p.unit ? ' ' + p.unit : ''}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted tabular-nums">{fmt(m.received_at, { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('note')}</p>
    </PageShell>
  )
}
