'use client'
import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus, Boxes, ShoppingCart, AlertTriangle, LineChart as LineIcon } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { ForecastChart } from '@/components/forecast/ForecastChart'
import { ProductLink } from '@/components/EntityLink'
import { fmtSAR, fmtNum, categoryLabel } from '@/lib/data/dataset'
import { revenueForecast, demandForecast, ordersForecast, categoryDemandForecast, inventoryForecast } from '@/lib/data/forecast'

const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 1000) / 10}%`
const trendIcon = (t: string) => t === 'up' ? TrendingUp : t === 'down' ? TrendingDown : Minus

export default function ForecastPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('forecast'); const locale = useLocale() as 'en' | 'ar'
  const rev = useMemo(() => revenueForecast(3, locale), [locale])
  const dem = useMemo(() => demandForecast(3, locale), [locale])
  const ord = useMemo(() => ordersForecast(3, locale), [locale])
  const cats = useMemo(() => categoryDemandForecast(), [])
  const stock = useMemo(() => inventoryForecast(), [])

  const STATUS: Record<string, string> = { critical: 'bg-accent-soft text-accent', watch: 'bg-warn-soft text-warn', ok: 'bg-success-soft text-success', idle: 'bg-bg-soft text-muted' }
  const RevTrend = trendIcon(rev.trend)

  return (
    <PageShell requires="analytics" breadcrumbs={[{ label: tNav('secIntel') }, { label: t('title') }]}>
      <header className="mb-7 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('title')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      {/* KPIs */}
      <section className="mb-7 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kRevenue')} amount={rev.nextValue} accent delta={`${pct(rev.momGrowth)} ${t('mom')} · ${t('cagr')} ${pct(rev.cagr)}`} index={0} />
        <StatCard label={t('kDemand')} value={fmtNum(dem.nextValue)} delta={`${pct(dem.momGrowth)} ${t('mom')} · ${t('cartons')}`} index={1} />
        <StatCard label={t('kOrders')} value={fmtNum(ord.nextValue)} delta={`${pct(ord.momGrowth)} ${t('mom')}`} index={2} accent />
        <StatCard label={t('kRisk')} value={String(stock.critical + stock.watch)} delta={t('riskSub', { c: stock.critical, cover: stock.avgDaysCover })} index={3} />
      </section>

      <NoteCallout className="mb-7" tone="info" title={t('methodTitle')}>{t('methodBody')}</NoteCallout>

      {/* Revenue + growth forecast */}
      <section className="mb-6">
        <ForecastChart points={rev.points} valueFormat="sar" locale={locale} height={300} actualLabel={t('actual')} forecastLabel={t('forecast')}
          title={t('revTitle')} subtitle={t('revSub', { r2: Math.round(rev.r2 * 100) })} />
      </section>

      {/* Demand + Orders */}
      <section className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <ForecastChart points={dem.points} valueFormat="num" locale={locale} actualLabel={t('actual')} forecastLabel={t('forecast')} title={t('demTitle')} subtitle={t('demSub')} />
        <ForecastChart points={ord.points} valueFormat="num" locale={locale} actualLabel={t('actual')} forecastLabel={t('forecast')} title={t('ordTitle')} subtitle={t('ordSub')} />
      </section>

      {/* Category demand forecast */}
      <Panel className="mb-6" bodyClassName="px-0 pb-0" title={t('catTitle')} subtitle={t('catSub')}>
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted border-b border-border">
            <th className="text-start font-medium px-5 md:px-6 py-3">{t('colCategory')}</th>
            <th className="text-end font-medium px-4 py-3">{t('colCurrent')}</th>
            <th className="text-end font-medium px-4 py-3">{t('colNext')}</th>
            <th className="text-end font-medium px-5 md:px-6 py-3">{t('colChange')}</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {cats.map((c, i) => {
              const Icon = trendIcon(c.change > 0.02 ? 'up' : c.change < -0.02 ? 'down' : 'flat')
              return (
                <tr key={i} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5"><span className="inline-flex items-center rounded-full bg-bg-soft px-2.5 py-0.5 text-[12px] text-text-soft">{categoryLabel(c.category, locale)}</span></td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-text-soft">{fmtNum(c.current)}</td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-text font-medium">{fmtNum(c.next)}</td>
                  <td className={clsx('px-5 md:px-6 py-2.5 text-end tabular-nums font-medium', c.change > 0.02 ? 'text-success' : c.change < -0.02 ? 'text-accent' : 'text-muted')}>
                    <span className="inline-flex items-center gap-1 justify-end"><Icon className="h-3.5 w-3.5" strokeWidth={2} />{pct(c.change)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-5 md:px-6 py-3 border-t border-border text-[11px] text-muted">{t('catNote')}</div>
      </Panel>

      {/* Inventory stockout forecast */}
      <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><Boxes className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('invTitle')}</span>} subtitle={t('invSub')}>
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-3">{t('colProduct')}</th>
              <th className="text-end font-medium px-4 py-3">{t('colOnHand')}</th>
              <th className="text-end font-medium px-4 py-3 hidden sm:table-cell">{t('colMonthlyOut')}</th>
              <th className="text-end font-medium px-4 py-3">{t('colDaysCover')}</th>
              <th className="text-end font-medium px-4 py-3 hidden md:table-cell">{t('colReorderIn')}</th>
              <th className="text-center font-medium px-5 md:px-6 py-3">{t('colStatus')}</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {stock.rows.slice(0, 25).map((r, i) => (
                <tr key={i} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 max-w-[260px] truncate"><ProductLink item={r.item} /></td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-text-soft">{fmtNum(r.onHand)}</td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-muted hidden sm:table-cell">{fmtNum(r.avgMonthlyOut)}</td>
                  <td className={clsx('px-4 py-2.5 text-end tabular-nums font-medium', r.status === 'critical' ? 'text-accent' : r.status === 'watch' ? 'text-warn' : 'text-text')}>{r.daysCover == null ? '—' : t('days', { n: r.daysCover })}</td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-muted hidden md:table-cell">{r.reorderInDays == null ? '—' : r.reorderInDays <= 0 ? t('now') : t('days', { n: r.reorderInDays })}</td>
                  <td className="px-5 md:px-6 py-2.5 text-center"><span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', STATUS[r.status])}>{t(`st_${r.status}`)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 md:px-6 py-3 border-t border-border"><NoteCallout tone="warn" title={t('invNoteTitle')}>{t('invNote')}</NoteCallout></div>
      </Panel>

      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('foot')}</p>
    </PageShell>
  )
}
