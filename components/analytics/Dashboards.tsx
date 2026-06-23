'use client'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { BarChartPanel } from '@/components/BarChartPanel'
import { LineChartPanel } from '@/components/LineChartPanel'
import { DonutStat } from '@/components/DonutStat'
import { InfoTooltip } from '@/components/InfoTooltip'
import { NoteCallout } from '@/components/NoteCallout'
import { ProfitDiagram } from '@/components/analytics/ProfitDiagram'
import {
  salesSummary, salesByMonth, salesBySalesperson, salesByCategory, salesByClientName, topProducts,
  collectionsSummary, supplierSpend, purchasesByCategory, procurementSummary, productMargins, profitSummary,
  categoryLabel, fmtSAR, type SalesFilter
} from '@/lib/data/dataset'

type P = { filter: SalesFilter; locale: 'en' | 'ar' }
const f0 = (n: number) => Math.round(n).toLocaleString('en-US')

function MonthLine({ filter, locale, title }: P & { title: string }) {
  const data = salesByMonth(filter).map(m => ({ t: locale === 'ar' ? m.tAr : m.t, revenue: Math.round(m.v) }))
  const t = useTranslations('analytics')
  return <LineChartPanel data={data} series={[{ key: 'revenue', label: t('kRevenue'), accent: true }]} title={title} locale={locale} height={260} valueFormat="sar" />
}

function CategoryDonut({ filter, locale, title }: P & { title: string }) {
  const t = useTranslations('analytics')
  const cats = salesByCategory(filter)
  return (
    <Panel title={title}>
      <DonutStat centerValue={fmtSAR(cats.reduce((s, c) => s + c.v, 0))} centerLabel={t('kRevenue')} valueFmt={fmtSAR}
        segments={cats.map((c, i) => ({ label: categoryLabel(c.key, locale), value: c.v, accent: i === 0 }))} />
    </Panel>
  )
}

function TopClientsTable({ filter, locale, title }: P & { title: string }) {
  const t = useTranslations('analytics')
  const rows = salesByClientName(filter).slice(0, 10)
  return (
    <Panel title={title} bodyClassName="px-0 pb-0">
      <div className="overflow-x-auto scrollbar-soft">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted border-b border-border">
            <th className="text-start font-medium px-5 md:px-6 py-3">{t('colClient')}</th>
            <th className="text-end font-medium px-4 py-3">{t('colInvoices')}</th>
            <th className="text-end font-medium px-4 py-3">{t('colCollected')}</th>
            <th className="text-end font-medium px-5 md:px-6 py-3">{t('kRevenue')}</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-surface-elev transition-colors">
                <td className="px-5 md:px-6 py-2.5 text-text max-w-[280px] truncate">{r.name}</td>
                <td className="px-4 py-2.5 text-end tabular-nums text-text-soft">{r.invoices}</td>
                <td className="px-4 py-2.5 text-end tabular-nums text-success">{fmtSAR(r.collected)}</td>
                <td className="px-5 md:px-6 py-2.5 text-end tabular-nums text-accent font-medium">{fmtSAR(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

export function OverviewDashboard({ filter, locale }: P) {
  const t = useTranslations('analytics')
  const s = salesSummary(filter); const proc = procurementSummary()
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Revenue = Collected + Receivables (reconciles on screen). VAT shown separately. */}
      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kRevenue')} value={fmtSAR(s.revenue)} accent infoId="revenue" index={0} />
        <StatCard label={t('collected')} value={fmtSAR(s.collected)} infoId="collected" index={1} />
        <StatCard label={t('kReceivables')} value={fmtSAR(s.outstanding)} accent infoId="receivables" index={2} />
        <StatCard label={t('kVat')} value={fmtSAR(s.vat)} infoId="vat" index={3} />
      </section>
      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kInvoices')} value={f0(s.invoices)} infoId="invoices" index={0} />
        <StatCard label={t('kActiveClients')} value={f0(s.clients)} infoId="clients" index={1} />
        <StatCard label={t('kAvgInvoice')} value={fmtSAR(s.avgInvoice)} infoId="avgInvoice" index={2} />
        <StatCard label={t('kSpend')} value={fmtSAR(proc.spend)} infoId="procurement" index={3} />
      </section>
      <NoteCallout tone="info">{t('reconcileNote')}</NoteCallout>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <MonthLine filter={filter} locale={locale} title={t('revByMonth')} />
        <CategoryDonut filter={filter} locale={locale} title={t('byCategory')} />
      </section>
      <TopClientsTable filter={filter} locale={locale} title={t('topClients')} />
    </div>
  )
}

export function SalesDashboard({ filter, locale }: P) {
  const t = useTranslations('analytics')
  const reps = salesBySalesperson(filter)
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <MonthLine filter={filter} locale={locale} title={t('revByMonth')} />
        <BarChartPanel locale={locale} title={t('revBySalesperson')} valueFormat="sar" valueLabel={t('kRevenue')}
          data={reps.map((r, i) => ({ label: locale === 'ar' ? r.ar : r.en, value: r.v, accent: i === 0 }))} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <CategoryDonut filter={filter} locale={locale} title={t('byCategory')} />
        <TopClientsTable filter={filter} locale={locale} title={t('topClients')} />
      </section>
    </div>
  )
}

export function ProcurementDashboard({ locale }: P) {
  const t = useTranslations('analytics')
  const suppliers = supplierSpend(10); const cats = purchasesByCategory(); const proc = procurementSummary()
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('kSpend')} value={fmtSAR(proc.spend)} accent infoId="procurement" index={0} />
        <StatCard label={t('kSuppliers')} value={f0(proc.suppliers)} infoId="suppliers" index={1} />
        <StatCard label={t('kPurchaseLines')} value={f0(proc.lines)} infoId="purchaseLines" index={2} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <BarChartPanel locale={locale} title={t('spendBySupplier')} height={300} valueFormat="sar" valueLabel={t('kSpend')}
          data={suppliers.map((s, i) => ({ label: s.supplier.replace(/^(شركة|مؤسسة)\s/, '').slice(0, 14), value: s.spend, accent: i === 0 }))} />
        <Panel title={t('spendByCategory')}>
          <DonutStat centerValue={fmtSAR(cats.reduce((s, c) => s + c.v, 0))} centerLabel={t('kSpend')} valueFmt={fmtSAR}
            segments={cats.map((c, i) => ({ label: categoryLabel(c.key, locale), value: c.v, accent: i === 0 }))} />
        </Panel>
      </section>
      <NoteCallout tone="warn">{t('procNote')}</NoteCallout>
    </div>
  )
}

export function MarginDashboard({ locale }: P) {
  const t = useTranslations('analytics')
  const all = productMargins()
  const sum = profitSummary()
  const priced = all.filter(p => p.confidence !== 'none')
  const topByGP = priced.slice(0, 15)                            // detailed diagram: top products by gross profit
  const f0 = (n: number) => Math.round(n).toLocaleString('en-US')
  const statusCell = (p: typeof all[number]) => {
    if (p.confidence === 'none') return <span className="text-muted">{t('costNa')}</span>
    if (p.marginPct != null && p.marginPct < 0) return <span className="inline-flex items-center gap-1 text-accent font-medium"><AlertTriangle className="h-3.5 w-3.5" />{t('loss')}</span>
    if (p.belowMin) return <span className="inline-flex items-center gap-1 text-warn font-medium"><AlertTriangle className="h-3.5 w-3.5" />{t('belowMin')}</span>
    return <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3.5 w-3.5" />{t('healthy')}</span>
  }
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('totalGrossProfit')} value={fmtSAR(sum.grossProfit)} accent infoId="grossProfitActual" index={0} />
        <StatCard label={t('overallMargin')} value={`${sum.marginPct}%`} infoId="overallMargin" index={1} />
        <StatCard label={t('belowMinCount')} value={`${sum.belowMin}`} accent infoId="belowMinCount" index={2} />
        <StatCard label={t('lossMakers')} value={`${sum.lossMakers}`} infoId="lossMakers" index={3} />
      </section>

      <ProfitDiagram rows={topByGP} title={t('profitDiagram')} subtitle={t('profitDiagramSub')} />

      <Panel title={t('profitTable')} bodyClassName="px-0 pb-0">
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-3">{t('colProduct')}</th>
              <th className="text-start font-medium px-3 py-3 hidden md:table-cell"><span className="inline-flex items-center gap-1.5">{t('colCategory')}<InfoTooltip id="category" /></span></th>
              <th className="text-end font-medium px-3 py-3 hidden sm:table-cell">{t('colCartons')}</th>
              <th className="text-end font-medium px-3 py-3"><span className="inline-flex items-center gap-1.5">{t('avgSell')}<InfoTooltip id="avgSell" /></span></th>
              <th className="text-end font-medium px-3 py-3"><span className="inline-flex items-center gap-1.5">{t('avgCost')}<InfoTooltip id="avgCost" /></span></th>
              <th className="text-end font-medium px-3 py-3"><span className="inline-flex items-center gap-1.5">{t('grossProfit')}<InfoTooltip id="grossProfitActual" /></span></th>
              <th className="text-end font-medium px-3 py-3">{t('marginPct')}</th>
              <th className="text-end font-medium px-3 py-3 hidden sm:table-cell">{t('minMargin')}</th>
              <th className="text-end font-medium px-5 md:px-6 py-3">{t('status')}</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {all.map((p, i) => (
                <tr key={i} className={clsx('hover:bg-surface-elev transition-colors', p.belowMin && p.confidence !== 'none' && 'bg-warn-soft/30', p.marginPct != null && p.marginPct < 0 && 'bg-accent-soft/30')}>
                  <td className="px-5 md:px-6 py-2.5 text-text max-w-[260px] truncate">{p.item}</td>
                  <td className="px-3 py-2.5 text-text-soft hidden md:table-cell">{categoryLabel(p.category, locale)}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-text-soft hidden sm:table-cell">{f0(p.units)}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-text-soft">{fmtSAR(p.avgSell)}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-text-soft">{p.unitCost != null ? fmtSAR(p.unitCost) : '—'}</td>
                  <td className={clsx('px-3 py-2.5 text-end tabular-nums font-medium', p.grossProfit == null ? 'text-muted' : p.grossProfit < 0 ? 'text-accent' : 'text-success')}>{p.grossProfit != null ? fmtSAR(p.grossProfit) : '—'}</td>
                  <td className={clsx('px-3 py-2.5 text-end tabular-nums', p.marginPct == null ? 'text-muted' : p.marginPct < 0 ? 'text-accent' : p.belowMin ? 'text-warn' : 'text-success')}>{p.marginPct != null ? `${p.marginPct}%` : '—'}</td>
                  <td className="px-3 py-2.5 text-end tabular-nums text-muted hidden sm:table-cell">{p.minMargin}%</td>
                  <td className="px-5 md:px-6 py-2.5 text-end text-xs">{statusCell(p)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <NoteCallout tone="info">{t('profitNote')}</NoteCallout>
    </div>
  )
}

export function CollectionsDashboard({ filter, locale }: P) {
  const t = useTranslations('analytics')
  const c = collectionsSummary(filter)
  const monthly = salesByMonth(filter)
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('collected')} value={fmtSAR(c.collected)} accent infoId="collected" index={0} />
        <StatCard label={t('outstanding')} value={fmtSAR(c.outstanding)} infoId="outstanding" index={1} />
        <StatCard label={t('cash')} value={fmtSAR(c.cash)} infoId="cash" index={2} />
        <StatCard label={t('bank')} value={fmtSAR(c.bank)} infoId="bank" index={3} />
      </section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <Panel title={t('collectedVsOutstanding')}>
          <DonutStat centerValue={fmtSAR(c.total)} centerLabel={t('kRevenue')} valueFmt={fmtSAR}
            segments={[{ label: t('collected'), value: Math.max(0, c.collected), accent: true }, { label: t('outstanding'), value: Math.max(0, c.outstanding) }]} />
        </Panel>
        <LineChartPanel locale={locale} title={t('revByMonth')} valueFormat="sar"
          data={monthly.map(m => ({ t: locale === 'ar' ? m.tAr : m.t, v: Math.round(m.v) }))}
          series={[{ key: 'v', label: t('kRevenue'), accent: true }]} height={260} />
      </section>
    </div>
  )
}

export function ProductsDashboard({ filter, locale }: P) {
  const t = useTranslations('analytics')
  const byRev = topProducts(filter, 10); const byVol = [...topProducts(filter, 40)].sort((a, b) => b.qty - a.qty).slice(0, 10)
  return (
    <div className="space-y-6 md:space-y-8">
      <BarChartPanel locale={locale} title={t('topByRevenue')} height={300} valueFormat="sar" valueLabel={t('kRevenue')}
        data={byRev.map((p, i) => ({ label: p.item.slice(0, 16), value: p.revenue, accent: i === 0 }))} />
      <Panel title={t('topProducts')} bodyClassName="px-0 pb-0">
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-3">{t('colItem')}</th>
              <th className="text-start font-medium px-4 py-3">{t('colCategory')}</th>
              <th className="text-end font-medium px-4 py-3">{t('colQty')}</th>
              <th className="text-end font-medium px-5 md:px-6 py-3">{t('kRevenue')}</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {byRev.map((p, i) => (
                <tr key={i} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 text-text max-w-[320px] truncate">{p.item}</td>
                  <td className="px-4 py-2.5 text-text-soft">{categoryLabel(p.category, locale)}</td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-text-soft">{f0(p.qty)}</td>
                  <td className="px-5 md:px-6 py-2.5 text-end tabular-nums text-accent font-medium">{fmtSAR(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <BarChartPanel locale={locale} title={t('topByVolume')} height={260} valueFormat="num" valueLabel={t('colQty')}
        data={byVol.map((p, i) => ({ label: p.item.slice(0, 16), value: p.qty, accent: i === 0 }))} />
    </div>
  )
}
