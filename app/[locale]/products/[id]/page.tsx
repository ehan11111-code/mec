'use client'
import { use, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import { clsx } from 'clsx'
import { ArrowLeft, Package, TrendingUp, AlertTriangle, Globe, ExternalLink, RefreshCw } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { LineChartPanel } from '@/components/LineChartPanel'
import { NoteCallout } from '@/components/NoteCallout'
import { ClientLink } from '@/components/EntityLink'
import { getProductDetail, categoryLabel, fmtSAR, fmtNum } from '@/lib/data/dataset'

type Win = 3 | 6 | 0  // last N months, 0 = all

// product category → supply-intelligence commodity keyword (for the daily alerts tab)
const CAT_COMMODITY: Record<string, RegExp> = {
  Beef: /beef|بقر|لحم/i, Lamb: /lamb|mutton|غنم|ضأن/i, Poultry: /chicken|poultry|دجاج|دواجن/i,
  Processed: /processed|مصنّع/i, Dairy: /dairy|cheese|جبن|ألبان/i, Vegetables: /potato|vegetable|بطاطس|خضار/i
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tNav = useTranslations('nav'); const t = useTranslations('productDetail'); const locale = useLocale() as 'en' | 'ar'
  const item = decodeURIComponent(id)
  const detail = getProductDetail(item)
  const [tab, setTab] = useState<'overview' | 'alerts'>('overview')
  const [win, setWin] = useState<Win>(0)
  const [intel, setIntel] = useState<any[] | null>(null)

  useEffect(() => { if (tab === 'alerts' && intel === null) fetch('/api/supply-intel').then(r => r.json()).then(d => setIntel(Array.isArray(d) ? d : [])).catch(() => setIntel([])) }, [tab, intel])

  // hooks must run before any early return
  const monthly = useMemo(() => { const m = detail?.monthly ?? []; return win === 0 ? m : m.slice(-win) }, [detail, win])
  const priceSeries = useMemo(() => {
    if (!detail) return []
    const costByMonth = new Map(detail.costHistory.map(c => [c.key, c.cost]))
    return monthly.map(m => ({ t: locale === 'ar' ? m.tAr : m.t, sell: m.avgSell, cost: costByMonth.get(m.key) ?? null }))
  }, [detail, monthly, locale])

  if (!detail) notFound()
  const { summary, topClients } = detail

  // window-scoped margin
  const winUnits = monthly.reduce((s, m) => s + m.units, 0)
  const winRevenue = monthly.reduce((s, m) => s + m.revenue, 0)
  const winMargin = summary.unitCost != null && winRevenue > 0 ? Math.round(((winRevenue - winUnits * summary.unitCost) / winRevenue) * 1000) / 10 : null

  const fmtDate = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d } }
  const commodityRe = CAT_COMMODITY[detail.category]
  const alerts = (intel ?? []).filter(r => !commodityRe || commodityRe.test(`${r.commodity} ${r.country}`))
  const wins: { v: Win; k: string }[] = [{ v: 0, k: 'all' }, { v: 6, k: 'm6' }, { v: 3, k: 'm3' }]

  return (
    <PageShell requires="orders" breadcrumbs={[{ label: tNav('operations') }, { label: tNav('products') }, { label: item }]}>
      <header className="mb-6">
        <Link href="/products" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5 flip-rtl" strokeWidth={1.7} />{t('back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Eyebrow accent>{t('eyebrow')} · {categoryLabel(detail.category, locale)}</Eyebrow>
            <DisplayHeading size="lg" className="mt-3" locale={locale}>{item}</DisplayHeading>
            <p className="text-sm text-text-soft mt-2">{t('sold', { first: fmtDate(summary.firstDate), last: fmtDate(summary.lastDate) })}</p>
          </div>
          {summary.belowMin && <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft text-accent px-3 py-1 text-xs font-medium"><AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />{t('belowMin')}</span>}
        </div>
      </header>

      {/* tabs */}
      <div className="mb-6 inline-flex rounded-full border border-border bg-surface p-1">
        {(['overview', 'alerts'] as const).map(tb => (
          <button key={tb} type="button" onClick={() => setTab(tb)}
            className={clsx('inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors', tab === tb ? 'bg-accent text-white' : 'text-text-soft hover:text-text')}>
            {tb === 'overview' ? <TrendingUp className="h-3.5 w-3.5" strokeWidth={1.9} /> : <Globe className="h-3.5 w-3.5" strokeWidth={1.9} />}{t(`tab_${tb}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <>
          {/* timeframe */}
          <div className="mb-5 flex items-center gap-2">
            <span className="text-xs text-muted">{t('timeframe')}:</span>
            {wins.map(w => (
              <button key={w.k} type="button" onClick={() => setWin(w.v)}
                className={clsx('rounded-full px-3 py-1 text-xs font-medium border transition-colors', win === w.v ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>{t(`win_${w.k}`)}</button>
            ))}
          </div>

          <section className="mb-6 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('kDemand')} value={fmtNum(winUnits)} delta={t('cartons')} infoId="units" index={0} accent />
            <StatCard label={t('kRevenue')} value={fmtSAR(winRevenue)} infoId="revenue" index={1} />
            <StatCard label={t('kAvgSell')} value={summary.avgSell ? fmtSAR(summary.avgSell) : '—'} delta={summary.unitCost ? `${t('cost')} ${fmtSAR(summary.unitCost)}` : undefined} infoId="avgSell" index={2} />
            <StatCard label={t('kMargin')} value={winMargin == null ? '—' : `${winMargin}%`} delta={summary.minMargin ? `${t('floor')} ${summary.minMargin}%` : undefined} infoId="grossProfitActual" index={3} accent />
          </section>

          <section className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
            {monthly.length > 0 ? (
              <LineChartPanel title={t('demandTrend')} subtitle={t('demandTrendSub')} locale={locale} height={250} valueFormat="num"
                data={monthly.map(m => ({ t: locale === 'ar' ? m.tAr : m.t, v: m.units }))} series={[{ key: 'v', label: t('kDemand'), accent: true }]} />
            ) : <Panel title={t('demandTrend')}><p className="py-12 text-center text-sm text-muted">{t('noData')}</p></Panel>}
            {priceSeries.some(p => p.cost != null) ? (
              <LineChartPanel title={t('priceTrend')} subtitle={t('priceTrendSub')} locale={locale} height={250} valueFormat="sar"
                data={priceSeries.map(p => ({ t: p.t, sell: p.sell, cost: p.cost ?? 0 }))}
                series={[{ key: 'sell', label: t('sellPrice'), accent: true }, { key: 'cost', label: t('buyPrice') }]} />
            ) : (
              <LineChartPanel title={t('priceTrend')} subtitle={t('priceTrendSub')} locale={locale} height={250} valueFormat="sar"
                data={monthly.map(m => ({ t: locale === 'ar' ? m.tAr : m.t, sell: m.avgSell }))} series={[{ key: 'sell', label: t('sellPrice'), accent: true }]} />
            )}
          </section>

          <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><Package className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('topBuyers')}</span>} subtitle={t('topBuyersSub')}>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-5 md:px-6 py-3">{t('client')}</th>
                <th className="text-end font-medium px-4 py-3">{t('kDemand')}</th>
                <th className="text-end font-medium px-5 md:px-6 py-3">{t('kRevenue')}</th>
              </tr></thead>
              <tbody className="divide-y divide-border">
                {topClients.map((c, i) => (
                  <tr key={i} className="hover:bg-surface-elev transition-colors">
                    <td className="px-5 md:px-6 py-3 text-text max-w-[320px] truncate"><ClientLink name={c.name} /></td>
                    <td className="px-4 py-3 text-end tabular-nums text-text-soft">{fmtNum(c.units)}</td>
                    <td className="px-5 md:px-6 py-3 text-end tabular-nums text-text font-medium">{fmtSAR(c.revenue)}</td>
                  </tr>
                ))}
                {topClients.length === 0 && <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-muted">{t('noData')}</td></tr>}
              </tbody>
            </table>
          </Panel>
        </>
      ) : (
        <section>
          <NoteCallout className="mb-5" title={t('alertsTitle')}>{t('alertsNote')}</NoteCallout>
          {intel === null ? (
            <Panel><div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><RefreshCw className="h-4 w-4 animate-spin" />…</div></Panel>
          ) : alerts.length === 0 ? (
            <Panel><p className="py-12 text-center text-sm text-muted">{t('noAlerts')}</p></Panel>
          ) : (
            <div className="space-y-4">
              {alerts.map((r, i) => (
                <Panel key={i}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-sm font-semibold text-text">{r.commodity} · {r.country}</h3>
                    {r.price_outlook?.direction && (
                      <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium',
                        r.price_outlook.direction === 'up' ? 'bg-accent-soft text-accent' : r.price_outlook.direction === 'down' ? 'bg-success-soft text-success' : 'bg-bg-soft text-muted')}>
                        {r.price_outlook.direction === 'up' ? '▲' : r.price_outlook.direction === 'down' ? '▼' : '■'} {r.price_outlook.change_pct ?? 0}%
                      </span>
                    )}
                  </div>
                  {r.recommendation && <p className="text-xs text-text-soft mb-3">{r.recommendation}</p>}
                  <ul className="space-y-2">
                    {(r.risks ?? []).slice(0, 4).map((rk: any, j: number) => (
                      <li key={j} className="flex items-start gap-2 text-xs">
                        <span className={clsx('mt-1 h-1.5 w-1.5 rounded-full shrink-0', rk.severity === 'high' ? 'bg-accent' : rk.severity === 'medium' ? 'bg-warn' : 'bg-muted')} />
                        <span className="text-text-soft">{rk.summary}
                          {rk.citation?.url && <a href={rk.citation.url} target="_blank" rel="noopener noreferrer" className="ms-1.5 inline-flex items-center gap-0.5 text-accent hover:underline">{rk.citation.source || t('source')}<ExternalLink className="h-3 w-3" strokeWidth={1.8} /></a>}
                        </span>
                      </li>
                    ))}
                    {(r.risks ?? []).length === 0 && <li className="text-xs text-muted">{t('noRisks')}</li>}
                  </ul>
                </Panel>
              ))}
            </div>
          )}
        </section>
      )}
    </PageShell>
  )
}
