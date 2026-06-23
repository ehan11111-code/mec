'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Radar, ExternalLink, ShieldAlert, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { Sparkline } from '@/components/Sparkline'
import { fmtSAR } from '@/lib/data/dataset'
import { baselineForCommodity } from '@/lib/data/priceBaseline'
import type { SupplyIntel } from '@/lib/data/supply'

const SEV: Record<string, string> = {
  high: 'bg-accent-soft text-accent border-accent/30',
  medium: 'bg-warn-soft text-warn border-warn/30',
  low: 'bg-bg-soft text-muted border-border'
}

export default function SupplyIntelligencePage() {
  const t = useTranslations('supplyIntel'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en' | 'ar'
  const [data, setData] = useState<SupplyIntel[] | null>(null)

  useEffect(() => {
    fetch('/api/supply-intel').then(r => r.json()).then(d => setData(Array.isArray(d) ? d : [])).catch(() => setData([]))
  }, [])

  const list = data ?? []
  const allRisks = list.flatMap(d => d.risks || [])
  const high = allRisks.filter(r => r.severity === 'high').length
  const last = list.map(d => d.generated_at).filter(Boolean).sort().at(-1)
  const lastLabel = last ? new Date(last).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('supplyIntel') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      <section className="mb-8 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kSuppliers')} value={data ? String(list.length) : '—'} infoId="supplyIntelFeed" index={0} accent />
        <StatCard label={t('kRisks')} value={data ? String(allRisks.length) : '—'} infoId="supplyRisks" index={1} />
        <StatCard label={t('kHigh')} value={data ? String(high) : '—'} infoId="supplyHigh" index={2} />
        <StatCard label={t('kUpdated')} value={list.length ? lastLabel : '—'} infoId="supplyUpdated" index={3} />
      </section>

      {data === null ? (
        <Panel><div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />…</div></Panel>
      ) : list.length === 0 ? (
        <Panel><EmptyState icon={Radar} title={t('emptyTitle')} hint={t('emptyHint')} source={t('source')} /></Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
          {list.map(d => {
            const base = baselineForCommodity(d.commodity)
            const po = d.price_outlook
            const lo = base && po ? Math.round(base.latest * (1 + po.low_pct / 100)) : null
            const hi = base && po ? Math.round(base.latest * (1 + po.high_pct / 100)) : null
            const Dir = po?.direction === 'down' ? TrendingDown : po?.direction === 'up' ? TrendingUp : Minus
            const dirTone = po?.direction === 'up' ? 'text-accent' : po?.direction === 'down' ? 'text-success' : 'text-muted'
            return (
            <Panel key={d.supplier}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-text leading-snug">{d.supplier}</h3>
                  <p className="text-xs text-muted mt-0.5 capitalize">{d.commodity} · {d.country}</p>
                </div>
                <span className="shrink-0 inline-flex items-center rounded-full bg-accent-soft text-accent px-3 py-1 text-xs font-medium capitalize">{d.recommendation}</span>
              </div>
              {d.forecast_window && (
                <p className="mt-2 text-xs text-text-soft"><span className="text-muted">{t('forecast')}:</span> {d.forecast_window}</p>
              )}

              {po && base && (
                <div className="mt-3 rounded-soft border border-accent/20 gradient-highlight p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">{t('priceOutlook')}</span>
                    <span className={clsx('inline-flex items-center gap-1 text-sm font-semibold tabular-nums', dirTone)}>
                      <Dir className="h-4 w-4" strokeWidth={2} />{po.change_pct > 0 ? '+' : ''}{po.change_pct}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                    <span className="text-[11px] text-muted">{t('lastReal')}</span>
                    <span className="text-sm font-medium text-text tabular-nums">{fmtSAR(base.latest)}</span>
                    <span className="text-[11px] text-muted">/ {base.unit}</span>
                    <span className="text-muted">→</span>
                    <span className="text-sm font-semibold text-accent tabular-nums">{lo !== null && hi !== null ? `${fmtSAR(lo)}–${fmtSAR(hi)}` : '—'}</span>
                    {po.confidence && <span className="text-[11px] text-muted">· {t(`conf_${po.confidence}`)}</span>}
                  </div>
                  {base.series.length > 1 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Sparkline data={base.series.map(s => s.cost)} accent />
                      <span className="text-[10px] text-muted">{t('histTrend', { months: base.series.length })}</span>
                    </div>
                  )}
                  {(po.drivers || []).length > 0 && (
                    <ul className="mt-2.5 space-y-1.5 border-t border-border/60 pt-2">
                      {po.drivers.map((dr, i) => (
                        <li key={i} className="text-[11px] text-text-soft leading-snug">
                          {dr.summary}
                          {dr.citation?.url && (
                            <a href={dr.citation.url} target="_blank" rel="noopener noreferrer" className="ms-1 inline-flex items-center gap-0.5 text-accent/90 hover:text-accent">
                              <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.8} />{dr.citation.source || t('source')}{dr.citation.date ? ` · ${dr.citation.date}` : ''}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-2.5">
                {(d.risks || []).length === 0 && <p className="text-xs text-muted">{t('noRisks')}</p>}
                {(d.risks || []).map((r, i) => (
                  <div key={i} className="rounded-soft border border-border bg-bg-soft/40 p-3">
                    <div className="flex items-center gap-2">
                      <span className={clsx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize', SEV[r.severity] || SEV.low)}>
                        <ShieldAlert className="h-3 w-3" strokeWidth={1.8} />{t(`sev_${r.severity}`)}
                      </span>
                      <span className="text-[11px] text-muted capitalize">{t(`type_${r.type}`)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-text-soft leading-snug">{r.summary}</p>
                    {r.citation?.url && (
                      <a href={r.citation.url} target="_blank" rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-accent/90 hover:text-accent transition-colors">
                        <ExternalLink className="h-3 w-3" strokeWidth={1.8} />
                        {r.citation.source || t('source')}{r.citation.date ? ` · ${r.citation.date}` : ''}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )})}
        </div>
      )}

      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('note')}</p>
    </PageShell>
  )
}
