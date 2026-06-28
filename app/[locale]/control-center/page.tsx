'use client'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Workflow } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { ConcernsBar } from '@/components/ConcernsBar'
import { CompanyReportButton } from '@/components/CompanyReportButton'
import { DisplayHeading } from '@/components/DisplayHeading'
import { DeptHeatStrip } from '@/components/DeptHeatStrip'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { BarChartPanel } from '@/components/BarChartPanel'
import { LineChartPanel } from '@/components/LineChartPanel'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { getFirmState } from '@/lib/mock/data'
import { crmSummary, ordersSummary, ordersByStatus, salesSummary, salesByMonth, topClients, clientName, fmtSAR } from '@/lib/data/dataset'
import { getCredit } from '@/lib/data/credit'

export default function ControlCenterPage() {
  const t = useTranslations('control'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en' | 'ar'
  const tOrd = useTranslations('orders'); const tCli = useTranslations('clients'); const tAna = useTranslations('analytics'); const tStatus = useTranslations('orderStatus')
  const firm = getFirmState()
  const crm = crmSummary(); const ord = ordersSummary(); const sales = salesSummary(); const byStatus = ordersByStatus(); const top = topClients(6)
  const statusBars = byStatus.map(s => ({ label: tStatus(s.status), value: s.count, accent: s.status === 'overdue' || s.status === 'payment_pending' }))
  const months = salesByMonth()
  const revLine = months.map(m => ({ t: locale === 'ar' ? m.tAr : m.t, revenue: Math.round(m.v) }))
  // Click-to-calculate breakdowns for the money KPIs.
  const credit = getCredit()
  const revenueBreakdown = { title: tAna('kRevenue'), formula: t('calc_revenue'), money: true, total: sales.revenue, lines: months.map(m => ({ label: locale === 'ar' ? m.tAr : m.t, value: Math.round(m.v) })) }
  const receivablesBreakdown = { title: tAna('kReceivables'), formula: t('calc_receivables'), money: true, total: credit.total, lines: credit.byClient.map(b => ({ label: b.client, value: b.amount })) }

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('controlCenter') }]}>
      <ConcernsBar />
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8 md:mb-10 max-w-3xl rounded-soft gradient-hero p-6 md:p-8 border border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-success-soft text-success px-3 py-1 text-xs font-medium"><span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />{t('eyebrow')}</div>
          <CompanyReportButton />
        </div>
        <DisplayHeading size="lg" className="mt-4" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </motion.header>

      <section className="mb-8 md:mb-10 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={tAna('kRevenue')} amount={sales.revenue} accent infoId="revenue" breakdown={revenueBreakdown} index={0} />
        <StatCard label={tOrd('kTotal')} value={String(ord.total)} infoId="ordersTotal" index={1} />
        <StatCard label={tCli('kTotal')} value={String(crm.total)} infoId="clientsTotal" index={2} />
        <StatCard label={tAna('kReceivables')} amount={sales.outstanding} accent infoId="receivables" breakdown={receivablesBreakdown} index={3} />
      </section>

      <section className="mb-8 md:mb-10 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <LineChartPanel data={revLine} series={[{ key: 'revenue', label: tAna('kRevenue'), accent: true }]} title={tAna('revByMonth')} locale={locale} valueFormat="sar" height={240} />
        <Panel title={tCli('topClients')} subtitle={tCli('topClientsSub')} bodyClassName="px-0 pb-0">
          <ul className="divide-y divide-border">
            {top.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3 px-5 md:px-6 py-3">
                <span className="shrink-0 w-5 text-xs tabular-nums text-muted">{i + 1}</span>
                <span className="flex-1 min-w-0 text-sm text-text truncate">{clientName(c, locale)}</span>
                <span className="shrink-0 text-sm font-medium tabular-nums text-accent">{fmtSAR(c.totalRevenue)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="mb-8 md:mb-10">
        <BarChartPanel data={statusBars} title={tOrd('byStatus')} subtitle={tOrd('byStatusSub')} locale={locale} valueFormat="num" valueLabel={tOrd('kTotal')} height={240} />
      </section>

      <section className="mb-6">
        <NoteCallout tone="info" title={t('opsLayerTitle')}>{t('opsLayerBody')}</NoteCallout>
      </section>
      <section className="mb-8 md:mb-10"><DeptHeatStrip departments={firm.departments} title={t('deptHeat')} subtitle={t('deptHeatSub')} /></section>

      <section>
        <div className="rounded-soft border border-border bg-surface shadow-soft">
          <EmptyState icon={Workflow} title={t('automationEmpty')} hint={t('automationEmptyHint')} source={tNav('automations')} />
        </div>
      </section>
    </PageShell>
  )
}
