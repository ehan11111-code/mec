'use client'
import { useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { BarChartPanel } from '@/components/BarChartPanel'
import { LineChartPanel } from '@/components/LineChartPanel'
import { DonutStat } from '@/components/DonutStat'
import { InfoTooltip } from '@/components/InfoTooltip'
import { NoteCallout } from '@/components/NoteCallout'
import {
  salesSummary, salesByMonth, salesBySalesperson, salesByCategory, salesByClientName, topProducts,
  collectionsSummary, supplierSpend, purchasesByCategory, procurementSummary, marginByCategory,
  monthLabel, categoryLabel, fmtSAR, type SalesFilter
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
  const grossProfit = s.revenue - proc.spend
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kRevenue')} value={fmtSAR(s.revenue)} accent infoId="revenue" index={0} />
        <StatCard label={t('kSpend')} value={fmtSAR(proc.spend)} infoId="procurement" index={1} />
        <StatCard label={t('kGrossProfit')} value={fmtSAR(grossProfit)} accent infoId="grossProfit" index={2} />
        <StatCard label={t('kReceivables')} value={fmtSAR(s.outstanding)} infoId="receivables" index={3} />
      </section>
      <section className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kInvoices')} value={f0(s.invoices)} infoId="invoices" index={0} />
        <StatCard label={t('kClients')} value={f0(s.clients)} infoId="clients" index={1} />
        <StatCard label={t('kVat')} value={fmtSAR(s.vat)} infoId="vat" index={2} />
        <StatCard label={t('kAvgInvoice')} value={fmtSAR(s.avgInvoice)} infoId="avgInvoice" index={3} />
      </section>
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
  const rows = marginByCategory()
  return (
    <div className="space-y-6 md:space-y-8">
      <BarChartPanel locale={locale} title={t('marginByCategory')} subtitle={t('marginSub')} valueFormat="pct" valueLabel={t('marginPct')}
        data={rows.map((r, i) => ({ label: categoryLabel(r.key, locale), value: r.marginPct, accent: i === 0 }))} height={260} />
      <Panel title={t('sellVsCost')} bodyClassName="px-0 pb-0">
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted border-b border-border">
              <th className="text-start font-medium px-5 md:px-6 py-3"><span className="inline-flex items-center gap-1.5">{t('colCategory')}<InfoTooltip id="category" /></span></th>
              <th className="text-end font-medium px-4 py-3"><span className="inline-flex items-center gap-1.5">{t('avgSell')}<InfoTooltip id="avgSell" /></span></th>
              <th className="text-end font-medium px-4 py-3"><span className="inline-flex items-center gap-1.5">{t('avgCost')}<InfoTooltip id="avgCost" /></span></th>
              <th className="text-end font-medium px-4 py-3"><span className="inline-flex items-center gap-1.5">{t('marginPct')}<InfoTooltip id="margin" /></span></th>
              <th className="text-end font-medium px-5 md:px-6 py-3">{t('kRevenue')}</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-surface-elev transition-colors">
                  <td className="px-5 md:px-6 py-2.5 text-text">{categoryLabel(r.key, locale)}</td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-text-soft">SAR {r.avgSell}</td>
                  <td className="px-4 py-2.5 text-end tabular-nums text-text-soft">SAR {r.avgCost}</td>
                  <td className={clsx('px-4 py-2.5 text-end tabular-nums font-medium', r.marginPct >= 20 ? 'text-success' : r.marginPct >= 10 ? 'text-warn' : 'text-accent')}>{r.marginPct}%</td>
                  <td className="px-5 md:px-6 py-2.5 text-end tabular-nums text-accent">{fmtSAR(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <NoteCallout tone="info">{t('marginNote')}</NoteCallout>
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
