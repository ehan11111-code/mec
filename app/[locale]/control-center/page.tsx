'use client'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { MetricRow } from '@/components/MetricCard'
import { DeptHeatStrip } from '@/components/DeptHeatStrip'
import { ActivityTrail } from '@/components/ActivityTrail'
import { InterventionQueue } from '@/components/InterventionQueue'
import { ChartPanel } from '@/components/ChartPanel'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { BarChartPanel } from '@/components/BarChartPanel'
import { getFirmState } from '@/lib/mock/data'
import { crmSummary, ordersSummary, ordersByStatus, topClients, clientName, fmtSAR } from '@/lib/data/dataset'
export default function ControlCenterPage() {
  const t = useTranslations('control'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en' | 'ar'
  const tOrd = useTranslations('orders'); const tCli = useTranslations('clients'); const tStatus = useTranslations('orderStatus')
  const firm = getFirmState()
  const crm = crmSummary(); const ord = ordersSummary(); const byStatus = ordersByStatus(); const top = topClients(6)
  const statusBars = byStatus.map(s => ({ label: tStatus(s.status), value: s.count, accent: s.status === 'overdue' || s.status === 'under_approval' }))
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('controlCenter') }]}>
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mb-8 md:mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-success-soft text-success px-3 py-1 text-xs font-medium"><span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />{t('eyebrow')}</div>
        <DisplayHeading size="lg" className="mt-4" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </motion.header>
      <section className="mb-8 md:mb-10"><MetricRow kpis={firm.firmKpis} locale={locale} /></section>

      <section className="mb-8 md:mb-10 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={tCli('kTotal')} value={String(crm.total)} index={0} accent />
        <StatCard label={tOrd('kOpen')} value={String(ord.open)} index={1} />
        <StatCard label={tOrd('kValue')} value={fmtSAR(ord.value)} index={2} />
        <StatCard label={tCli('kOverdue')} value={fmtSAR(crm.overdue)} index={3} accent />
      </section>

      <section className="mb-8 md:mb-10 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <BarChartPanel data={statusBars} title={tOrd('byStatus')} subtitle={tOrd('byStatusSub')} locale={locale} height={240} />
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

      <section className="mb-8 md:mb-10"><DeptHeatStrip departments={firm.departments} title={t('deptHeat')} subtitle={t('deptHeatSub')} /></section>
      <section className="mb-8 md:mb-10 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <ActivityTrail events={firm.globalActivity} locale={locale} title={t('executionLog')} subtitle={t('executionLogSub')} showDept maxHeight={420} />
        <InterventionQueue interventions={firm.globalInterventions} locale={locale} title={t('interventionsRequired')} subtitle={t('interventionsRequiredSub')} />
      </section>
      <section><ChartPanel chart={firm.trend} locale={locale} height={280} /></section>
    </PageShell>
  )
}
