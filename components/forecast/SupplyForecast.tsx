'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus, Ship, Loader2, ArrowRight } from 'lucide-react'
import { Panel } from '../Panel'
import { EmptyState } from '../EmptyState'
import { fmtSAR, categoryLabel } from '@/lib/data/dataset'
import { baselineForCommodity } from '@/lib/data/priceBaseline'
import type { SupplyIntel } from '@/lib/data/supply'

// Price/supply forecast: ties the supply-intelligence workflow's price outlook (direction + % range +
// lead time, from real news/FX) to MEC's REAL last purchase cost (priceBaseline) → projected cost range.
export function SupplyForecast() {
  const t = useTranslations('forecast'); const locale = useLocale() as 'en' | 'ar'
  const [data, setData] = useState<SupplyIntel[] | null>(null)
  useEffect(() => { fetch('/api/supply-intel', { cache: 'no-store' }).then(r => r.json()).then(d => setData(Array.isArray(d) ? d : [])).catch(() => setData([])) }, [])

  const rows = (data ?? []).filter(s => s.price_outlook)
  const DIR = { up: { icon: TrendingUp, tone: 'text-accent bg-accent-soft' }, down: { icon: TrendingDown, tone: 'text-success bg-success-soft' }, stable: { icon: Minus, tone: 'text-muted bg-bg-soft' } } as const
  const avgLead = rows.length ? Math.round(rows.reduce((a, s) => a + (s.lead_time_days || 0), 0) / rows.length) : 0

  return (
    <Panel className="mb-6" bodyClassName="px-0 pb-0"
      title={<span className="inline-flex items-center gap-2"><Ship className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('supplyTitle')}</span>}
      subtitle={t('supplySub', { lead: avgLead })}>
      {data === null ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Ship} title={t('supplyEmpty')} hint={t('supplyEmptyHint')} source="Supabase · supply_intel" />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((s, i) => {
            const po = s.price_outlook!
            const d = DIR[po.direction] || DIR.stable; const Icon = d.icon
            const base = baselineForCommodity(s.commodity)
            const cur = base?.latest ?? null
            const proj = cur != null ? cur * (1 + po.change_pct / 100) : null
            const lo = cur != null ? cur * (1 + po.low_pct / 100) : null
            const hi = cur != null ? cur * (1 + po.high_pct / 100) : null
            return (
              <li key={i} className="px-5 md:px-6 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text">{categoryLabel(base?.category || s.commodity, locale)}{s.country ? ` · ${s.country}` : ''}</div>
                    <div className="text-[11px] text-muted mt-0.5">{s.supplier}</div>
                  </div>
                  <span className={clsx('shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium', d.tone)}>
                    <Icon className="h-3 w-3" strokeWidth={2} />{po.change_pct >= 0 ? '+' : ''}{po.change_pct}%
                  </span>
                </div>
                {cur != null ? (
                  <div className="mt-2 flex items-center flex-wrap gap-2 text-sm">
                    <span className="text-muted">{t('yourCost')}</span>
                    <span className="tabular-nums text-text-soft">{fmtSAR(cur)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={2} />
                    <span className="tabular-nums font-semibold text-text">{fmtSAR(proj!)}</span>
                    <span className="text-[11px] text-muted">({fmtSAR(lo!)}–{fmtSAR(hi!)})</span>
                  </div>
                ) : <div className="mt-2 text-xs text-muted">{t('noBaseline')}</div>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                  {s.lead_time_days ? <span className="inline-flex items-center gap-1"><Ship className="h-3 w-3" strokeWidth={1.8} />{t('leadTime', { d: s.lead_time_days })}</span> : null}
                  <span>{t('confidence')}: {t(`conf_${po.confidence}`)}</span>
                </div>
                {s.recommendation && <p className="mt-1.5 text-xs text-text-soft leading-snug">{s.recommendation}</p>}
              </li>
            )
          })}
        </ul>
      )}
      <div className="px-5 md:px-6 py-3 border-t border-border text-[11px] text-muted">{t('supplyNote')}</div>
    </Panel>
  )
}
