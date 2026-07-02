'use client'
import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { RefreshCw, Loader2, ShoppingBag, Zap } from 'lucide-react'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { BarChartPanel } from '@/components/BarChartPanel'
import { DonutStat } from '@/components/DonutStat'
import { EmptyState } from '@/components/EmptyState'
import { fmtSAR } from '@/lib/data/dataset'
import { fmtDateTime } from '@/lib/format/datetime'

type NameAgg = { name: string; orders: number; revenue: number; lastAt: string }
type LiveOrder = { id: string; client: string; salesperson: string; revenue: number; units: number; status: string; at: string; auto: boolean; source: 'portal' | 'whatsapp' }
type Summary = { count: number; revenue: number; pricedCount: number; approved: number; pending: number; rejected: number; autoApproved: number; bySalesperson: NameAgg[]; byClient: NameAgg[]; recent: LiveOrder[]; generatedAt: string }

const STATUS_TONE: Record<string, string> = { approved: 'bg-success-soft text-success', pending: 'bg-warn-soft text-warn', rejected: 'bg-bg-soft text-muted' }

export function LiveOrdersAnalytics() {
  const t = useTranslations('liveOrders'); const locale = useLocale() as 'en' | 'ar'
  const [d, setD] = useState<Summary | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try { const r = await fetch('/api/orders/live', { cache: 'no-store' }).then(x => x.json()); if (r && typeof r.count === 'number') setD(r) } catch { setD(s => s ?? null) }
    if (manual) setRefreshing(false)
  }, [])
  useEffect(() => { load(); const id = setInterval(() => load(), 20000); return () => clearInterval(id) }, [load])

  const reps = (d?.bySalesperson || []).filter(s => s.revenue > 0).slice(0, 8)
  const repBars = reps.map((s, i) => ({ label: s.name, value: Math.round(s.revenue), accent: i === 0 }))
  const statusSegs = d ? [
    { label: t('approved'), value: d.approved, accent: true },
    { label: t('pending'), value: d.pending },
    { label: t('rejected'), value: d.rejected }
  ].filter(s => s.value > 0) : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button type="button" onClick={() => load(true)} disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={1.9} />{t('refresh')}
        </button>
      </div>

      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kOrders')} value={d ? String(d.count) : '—'} index={0} accent />
        <StatCard label={t('kRevenue')} value={d ? fmtSAR(d.revenue) : '—'} delta={d ? t('kRevenueSub', { n: d.pricedCount }) : undefined} index={1} />
        <StatCard label={t('kAuto')} value={d ? String(d.autoApproved) : '—'} index={2} />
        <StatCard label={t('kPending')} value={d ? String(d.pending) : '—'} index={3} />
      </section>

      {d === null ? (
        <Panel><div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />…</div></Panel>
      ) : d.count === 0 ? (
        <Panel><EmptyState icon={ShoppingBag} title={t('empty')} hint={t('emptyHint')} source={t('source')} /></Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              {repBars.length > 0
                ? <BarChartPanel title={t('bySalesperson')} subtitle={t('bySalespersonSub')} data={repBars} locale={locale} valueFormat="sar" valueLabel={t('kRevenue')} height={280} />
                : <Panel title={t('bySalesperson')}><EmptyState icon={ShoppingBag} title={t('noPriced')} hint={t('noPricedHint')} /></Panel>}
            </div>
            <Panel title={t('byStatus')}>
              {statusSegs.length > 0
                ? <DonutStat segments={statusSegs} centerValue={String(d.count)} centerLabel={t('kOrders')} />
                : <EmptyState icon={Zap} title={t('empty')} />}
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Panel title={t('byClient')} bodyClassName="px-0 pb-0">
              <ul className="divide-y divide-border">
                {d.byClient.map((c, i) => (
                  <li key={c.name + i} className="flex items-center justify-between gap-3 px-5 md:px-6 py-2.5 text-sm">
                    <span className="min-w-0"><span className="text-text truncate" dir="auto">{c.name}</span>
                      <span className="block text-[11px] text-muted">{t('ordersN', { n: c.orders })}</span></span>
                    <span className="shrink-0 text-text-soft tabular-nums">{c.revenue > 0 ? fmtSAR(c.revenue) : '—'}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title={t('recent')} bodyClassName="px-0 pb-0">
              <ul className="divide-y divide-border">
                {d.recent.map(o => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-5 md:px-6 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="text-text truncate flex items-center gap-1.5" dir="auto">
                        {o.source === 'portal' && <Zap className="h-3 w-3 text-accent shrink-0" strokeWidth={2} />}{o.client}
                      </span>
                      <span className="block text-[11px] text-muted">{o.salesperson} · {fmtDateTime(o.at, locale)}</span>
                    </span>
                    <span className="shrink-0 flex items-center gap-2">
                      {o.revenue > 0 && <span className="text-text-soft tabular-nums text-xs">{fmtSAR(o.revenue)}</span>}
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_TONE[o.status] || 'bg-bg-soft text-muted')}>{t(o.status)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>

          <p className="text-xs text-muted leading-relaxed max-w-3xl">{t('note')}</p>
        </>
      )}
    </div>
  )
}
