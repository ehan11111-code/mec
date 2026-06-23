'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Radar, ExternalLink, ShieldAlert, Loader2, TrendingUp, TrendingDown, Minus, Truck, Gauge, Lightbulb, Link2 } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { SupplyPriceChart } from '@/components/supply/SupplyPriceChart'
import { fmtSAR } from '@/lib/data/dataset'
import { baselineForCommodity } from '@/lib/data/priceBaseline'
import type { SupplyIntel } from '@/lib/data/supply'

const SEV: Record<string, string> = {
  high: 'bg-accent-soft text-accent border-accent/30',
  medium: 'bg-warn-soft text-warn border-warn/30',
  low: 'bg-bg-soft text-muted border-border'
}
const flag = (c: string) => ({ Brazil: '🇧🇷', India: '🇮🇳', Egypt: '🇪🇬', 'Saudi Arabia': '🇸🇦' } as Record<string, string>)[c] || '🌍'
function pressureTone(v: number) { return v >= 65 ? 'bg-accent' : v >= 45 ? 'bg-warn' : 'bg-success' }

function Cite({ c, fallback }: { c?: { source?: string; url?: string; date?: string }; fallback: string }) {
  if (!c?.url) return null
  return (
    <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-accent/90 hover:text-accent">
      <ExternalLink className="h-2.5 w-2.5" strokeWidth={1.8} />{c.source || fallback}{c.date ? ` · ${c.date}` : ''}
    </a>
  )
}

export default function SupplyIntelligencePage() {
  const t = useTranslations('supplyIntel'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en' | 'ar'
  const [data, setData] = useState<SupplyIntel[] | null>(null)
  const [tab, setTab] = useState<'forecasts' | 'recommendations' | 'crises'>('forecasts')

  useEffect(() => { fetch('/api/supply-intel').then(r => r.json()).then(d => setData(Array.isArray(d) ? d : [])).catch(() => setData([])) }, [])

  const list = data ?? []
  const allRisks = useMemo(() => list.flatMap(d => (d.risks || []).map(r => ({ ...r, supplier: d.supplier, country: d.country, commodity: d.commodity })))
    .sort((a, b) => ({ high: 0, medium: 1, low: 2 } as any)[a.severity] - ({ high: 0, medium: 1, low: 2 } as any)[b.severity]), [list])
  const high = allRisks.filter(r => r.severity === 'high').length
  const leadVals = list.map(d => d.lead_time_days).filter((n): n is number => typeof n === 'number')
  const avgLead = leadVals.length ? Math.round(leadVals.reduce((a, b) => a + b, 0) / leadVals.length) : null
  const last = list.map(d => d.generated_at).filter(Boolean).sort().at(-1)
  const lastLabel = last ? new Date(last).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  const tabs = [
    { id: 'forecasts' as const, label: t('tabForecasts') },
    { id: 'recommendations' as const, label: t('tabRecs') },
    { id: 'crises' as const, label: `${t('tabCrises')}${allRisks.length ? ` (${allRisks.length})` : ''}` }
  ]

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('supplyIntel') }]}>
      <header className="mb-7 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      <section className="mb-7 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard label={t('kSuppliers')} value={data ? String(list.length) : '—'} infoId="supplyIntelFeed" index={0} accent />
        <StatCard label={t('kRisks')} value={data ? String(allRisks.length) : '—'} infoId="supplyRisks" index={1} />
        <StatCard label={t('kHigh')} value={data ? String(high) : '—'} infoId="supplyHigh" index={2} />
        <StatCard label={t('kLead')} value={avgLead !== null ? t('days', { n: avgLead }) : '—'} infoId="supplyLead" index={3} />
        <StatCard label={t('kUpdated')} value={list.length ? lastLabel : '—'} infoId="supplyUpdated" index={4} />
      </section>

      {/* tab bar */}
      <div className="mb-5 inline-flex rounded-full border border-border bg-surface p-1">
        {tabs.map(tb => (
          <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
            className={clsx('px-4 py-1.5 rounded-full text-xs font-medium transition-colors', tab === tb.id ? 'bg-accent text-white' : 'text-text-soft hover:text-text')}>
            {tb.label}
          </button>
        ))}
      </div>

      {data === null ? (
        <Panel><div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />…</div></Panel>
      ) : list.length === 0 ? (
        <Panel><EmptyState icon={Radar} title={t('emptyTitle')} hint={t('emptyHint')} source={t('source')} /></Panel>
      ) : tab === 'forecasts' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 md:gap-6">
          {list.map(d => {
            const base = baselineForCommodity(d.commodity)
            const po = d.price_outlook
            const lo = base && po ? Math.round(base.latest * (1 + po.low_pct / 100)) : null
            const hi = base && po ? Math.round(base.latest * (1 + po.high_pct / 100)) : null
            const Dir = po?.direction === 'down' ? TrendingDown : po?.direction === 'up' ? TrendingUp : Minus
            const dirTone = po?.direction === 'up' ? 'text-accent' : po?.direction === 'down' ? 'text-success' : 'text-muted'
            const pi = typeof d.price_index === 'number' ? Math.max(0, Math.min(100, d.price_index)) : null
            const highRisks = (d.risks || []).filter(r => r.severity === 'high').length
            const sources = [...(po?.drivers || []).map(x => x.citation), ...(d.risks || []).map(x => x.citation)].filter(c => c?.url)
            return (
              <Panel key={d.supplier}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-text leading-snug flex items-center gap-2"><span>{flag(d.country)}</span>{d.supplier}</h3>
                    <p className="text-xs text-muted mt-0.5 capitalize">{d.commodity} · {d.country}</p>
                  </div>
                  <span className="shrink-0 inline-flex items-center rounded-full bg-accent-soft text-accent px-3 py-1 text-xs font-medium capitalize">{d.recommendation}</span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-soft border border-border bg-bg-soft/40 p-2.5">
                    <div className="text-[10px] text-muted">{t('priceOutlook')}</div>
                    <div className={clsx('mt-0.5 inline-flex items-center gap-1 text-sm font-semibold tabular-nums', dirTone)}><Dir className="h-4 w-4" strokeWidth={2} />{po ? `${po.change_pct > 0 ? '+' : ''}${po.change_pct}%` : '—'}</div>
                  </div>
                  <div className="rounded-soft border border-border bg-bg-soft/40 p-2.5">
                    <div className="text-[10px] text-muted flex items-center gap-1"><Truck className="h-3 w-3" strokeWidth={1.8} />{t('leadTime')}</div>
                    <div className="mt-0.5 text-sm font-semibold text-text tabular-nums">{typeof d.lead_time_days === 'number' ? t('days', { n: d.lead_time_days }) : '—'}</div>
                  </div>
                  <div className="rounded-soft border border-border bg-bg-soft/40 p-2.5">
                    <div className="text-[10px] text-muted flex items-center gap-1"><ShieldAlert className="h-3 w-3" strokeWidth={1.8} />{t('kRisks')}</div>
                    <div className="mt-0.5 text-sm font-semibold text-text tabular-nums">{(d.risks || []).length}{highRisks > 0 && <span className="text-accent text-xs"> · {highRisks} {t('sev_high').toLowerCase()}</span>}</div>
                  </div>
                </div>

                {pi !== null && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-muted mb-1"><span className="flex items-center gap-1"><Gauge className="h-3 w-3" strokeWidth={1.8} />{t('pressure')}</span><span className="tabular-nums">{pi}/100</span></div>
                    <div className="h-1.5 rounded-full bg-bg-soft overflow-hidden"><div className={clsx('h-full rounded-full', pressureTone(pi))} style={{ width: `${pi}%` }} /></div>
                  </div>
                )}

                {base && (
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-xs text-muted">{t('priceVsReal')}</span>
                      <span className="text-[11px] text-text-soft tabular-nums">{fmtSAR(base.latest)}{lo !== null && hi !== null ? ` → ${fmtSAR(lo)}–${fmtSAR(hi)}` : ''} <span className="text-muted">/ {base.unit}</span></span>
                    </div>
                    <SupplyPriceChart baseline={base} outlook={po} locale={locale} />
                  </div>
                )}

                {(po?.drivers || []).length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-2.5">
                    {po!.drivers.map((dr, i) => (<li key={i} className="text-[11px] text-text-soft leading-snug">↗ {dr.summary} <Cite c={dr.citation} fallback={t('source')} /></li>))}
                  </ul>
                )}
                {(d.risks || []).length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-border/60 pt-2.5">
                    {(d.risks || []).map((r, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={clsx('shrink-0 mt-0.5 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', SEV[r.severity] || SEV.low)}>{t(`sev_${r.severity}`)}</span>
                        <p className="text-[11px] text-text-soft leading-snug">{r.summary} <Cite c={r.citation} fallback={t('source')} /></p>
                      </div>
                    ))}
                  </div>
                )}

                {sources.length > 0 && (
                  <div className="mt-3 border-t border-border/60 pt-2.5">
                    <div className="text-[10px] text-muted mb-1 flex items-center gap-1"><Link2 className="h-3 w-3" strokeWidth={1.8} />{t('sources')} ({sources.length})</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">{sources.map((c, i) => <Cite key={i} c={c!} fallback={`#${i + 1}`} />)}</div>
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      ) : tab === 'recommendations' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {list.map(d => {
            const po = d.price_outlook
            const base = baselineForCommodity(d.commodity)
            const highRisks = (d.risks || []).filter(r => r.severity === 'high').length
            const up = po?.direction === 'up' ? po.change_pct : 0
            const weeks = typeof d.lead_time_days === 'number' ? Math.ceil(d.lead_time_days / 7) : null
            const action = highRisks > 0 || up >= 8 ? { key: 'secure', tone: 'bg-accent-soft text-accent' }
              : up > 0 ? { key: 'order', tone: 'bg-warn-soft text-warn' }
                : po?.direction === 'down' ? { key: 'wait', tone: 'bg-success-soft text-success' }
                  : { key: 'monitor', tone: 'bg-bg-soft text-muted' }
            const sources = [...(po?.drivers || []).map(x => x.citation), ...(d.risks || []).map(x => x.citation)].filter(c => c?.url)
            return (
              <Panel key={d.supplier}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-text flex items-center gap-2"><span>{flag(d.country)}</span>{d.supplier}</h3>
                  <span className={clsx('shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold', action.tone)}><Lightbulb className="h-3.5 w-3.5" strokeWidth={1.9} />{t(`act_${action.key}`)}</span>
                </div>
                <p className="mt-2 text-sm text-text-soft leading-relaxed">
                  {t(`actWhy_${action.key}`, { pct: Math.abs(po?.change_pct ?? 0), commodity: d.commodity })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {weeks !== null && <span className="inline-flex items-center gap-1 rounded-md bg-bg-soft px-2 py-1 text-[11px] text-text-soft"><Truck className="h-3 w-3" strokeWidth={1.8} />{t('orderAhead', { w: weeks })}</span>}
                  {base && po && <span className="inline-flex items-center rounded-md bg-bg-soft px-2 py-1 text-[11px] text-text-soft tabular-nums">{fmtSAR(base.latest)} → {fmtSAR(Math.round(base.latest * (1 + po.change_pct / 100)))} / {base.unit}</span>}
                  <span className="inline-flex items-center rounded-md bg-bg-soft px-2 py-1 text-[11px] text-text-soft capitalize">{t('apiRec')}: {d.recommendation}</span>
                </div>
                {sources.length > 0 && (
                  <div className="mt-3 border-t border-border/60 pt-2.5">
                    <div className="text-[10px] text-muted mb-1 flex items-center gap-1"><Link2 className="h-3 w-3" strokeWidth={1.8} />{t('sources')}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]">{sources.map((c, i) => <Cite key={i} c={c!} fallback={`#${i + 1}`} />)}</div>
                  </div>
                )}
              </Panel>
            )
          })}
        </div>
      ) : (
        <Panel bodyClassName="px-0 pb-0">
          {allRisks.length === 0 ? (
            <EmptyState icon={ShieldAlert} title={t('noCrises')} hint={t('noCrisesHint')} />
          ) : (
            <ul className="divide-y divide-border">
              {allRisks.map((r, i) => (
                <li key={i} className="flex items-start gap-3 px-5 md:px-6 py-3.5">
                  <span className={clsx('shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize', SEV[r.severity] || SEV.low)}><ShieldAlert className="h-3 w-3" strokeWidth={1.8} />{t(`sev_${r.severity}`)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-soft leading-snug">{r.summary}</p>
                    <p className="text-[11px] text-muted mt-0.5">{flag(r.country)} {r.supplier} · {t(`type_${r.type}`)} · <Cite c={r.citation} fallback={t('source')} /></p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('note')}</p>
    </PageShell>
  )
}
