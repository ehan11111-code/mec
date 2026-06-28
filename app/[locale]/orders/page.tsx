'use client'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { BarChartPanel } from '@/components/BarChartPanel'
import { ChartPanel } from '@/components/ChartPanel'
import { StatusBadge } from '@/components/StatusBadge'
import { ClientLink, ProductLink } from '@/components/EntityLink'
import { LatestOrders } from '@/components/LatestOrders'
import { getOrders, getClient, ordersByStatus, ordersSummary, revenueByMonth, categoryMix, clientName, fmtSAR, type OrderStatus } from '@/lib/data/dataset'
import { fmtDate, fmtDayMonth } from '@/lib/format/datetime'

export default function OrdersPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('orders'); const tStatus = useTranslations('orderStatus')
  const locale = useLocale() as 'en' | 'ar'
  const orders = getOrders(); const sum = ordersSummary(); const byStatus = ordersByStatus()
  const rev = revenueByMonth(); const cats = categoryMix()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const filtered = useMemo(() => filter === 'all' ? orders : orders.filter(o => o.status === filter), [filter, orders])
  const rows = filtered.slice(0, 80)

  const statusBars = byStatus.map(s => ({ label: tStatus(s.status), value: s.count, accent: s.status === 'overdue' || s.status === 'under_approval' }))
  const catBars = cats.map(c => ({ label: locale === 'ar' ? c.ar : c.en, value: c.qty, accent: c.key === 'Meat' }))
  const revChart = { title: { en: t('revenueTrend'), ar: t('revenueTrend') }, series: [{ key: 'rev', label: { en: 'SAR (M)', ar: 'ر.س (مليون)' }, data: rev, highlight: true }] }
  const filters: (OrderStatus | 'all')[] = ['all', 'under_approval', 'approved', 'on_route', 'delivered', 'payment_pending', 'overdue', 'paid']

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('orders') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      <section className="mb-8 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard label={t('kTotal')} value={String(sum.total)} infoId="ordersTotal" index={0} />
        <StatCard label={t('kOpen')} value={String(sum.open)} infoId="openOrders" index={1} accent />
        <StatCard label={t('kValue')} value={fmtSAR(sum.value)} infoId="orderValue" index={2} />
        <StatCard label={t('kMargin')} value={`${sum.avgMargin}%`} infoId="avgMargin" index={3} accent />
        <StatCard label={t('kOverdue')} value={String(sum.overdue)} infoId="openOrders" index={4} />
      </section>

      <LatestOrders className="mb-8" limit={6} />

      <section className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <BarChartPanel data={statusBars} title={t('byStatus')} subtitle={t('byStatusSub')} locale={locale} />
        <ChartPanel chart={revChart} locale={locale} height={260} title={t('revenueTrend')} />
      </section>

      <section className="mb-8">
        <BarChartPanel data={catBars} title={t('categoryMix')} subtitle={t('categoryMixSub')} locale={locale} height={240} />
      </section>

      <Panel bodyClassName="px-0 pb-0" title={tNav('orders')}>
        <div className="px-5 md:px-6 py-3 flex flex-wrap gap-2 border-b border-border">
          {filters.map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={clsx('rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                filter === f ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>
              {f === 'all' ? t('filterAll') : tStatus(f)}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted border-b border-border">
                <th className="text-start font-medium px-5 md:px-6 py-3">{t('colNumber')}</th>
                <th className="text-start font-medium px-4 py-3 whitespace-nowrap">{t('colDate')}</th>
                <th className="text-start font-medium px-4 py-3">{t('colClient')}</th>
                <th className="text-start font-medium px-4 py-3 hidden md:table-cell">{t('colItem')}</th>
                <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">{t('colRep')}</th>
                <th className="text-start font-medium px-4 py-3">{t('colStatus')}</th>
                <th className="text-end font-medium px-4 py-3">{t('colAmount')}</th>
                <th className="text-end font-medium px-4 py-3 hidden sm:table-cell">{t('colMargin')}</th>
                <th className="text-end font-medium px-5 md:px-6 py-3 hidden md:table-cell">{t('colDue')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(o => {
                const c = getClient(o.clientId)
                return (
                  <tr key={o.id} className="hover:bg-surface-elev transition-colors">
                    <td className="px-5 md:px-6 py-3 font-medium text-text tabular-nums whitespace-nowrap">{o.number}</td>
                    <td className="px-4 py-3 text-text-soft tabular-nums whitespace-nowrap">{fmtDate(o.date, locale)}</td>
                    <td className="px-4 py-3 text-text-soft max-w-[220px] truncate"><ClientLink name={o.clientName} id={o.clientId || undefined} display={c ? clientName(c, locale) : o.clientName} /></td>
                    <td className="px-4 py-3 text-text-soft max-w-[200px] truncate hidden md:table-cell"><ProductLink item={o.item} /></td>
                    <td className="px-4 py-3 text-text-soft hidden lg:table-cell">{locale === 'ar' ? o.salespersonAr : o.salespersonEn}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-end tabular-nums text-text">{fmtSAR(o.totalAmount)}</td>
                    <td className={clsx('px-4 py-3 text-end tabular-nums hidden sm:table-cell', o.marginPct >= 20 ? 'text-success' : o.marginPct >= 12 ? 'text-warn' : 'text-accent')}>{o.marginPct}%</td>
                    <td className="px-5 md:px-6 py-3 text-end tabular-nums text-muted hidden md:table-cell">{fmtDayMonth(o.dueDate)}</td>
                  </tr>
                )
              })}
              {rows.length === 0 && <tr><td colSpan={9} className="px-6 py-10 text-center text-sm text-muted">{t('empty')}</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </PageShell>
  )
}
