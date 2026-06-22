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
import { getFirmState } from '@/lib/mock/data'
export default function ControlCenterPage() {
  const t = useTranslations('control'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en' | 'ar'
  const firm = getFirmState()
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('controlCenter') }]}>
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mb-8 md:mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-success-soft text-success px-3 py-1 text-xs font-medium"><span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />{t('eyebrow')}</div>
        <DisplayHeading size="lg" className="mt-4" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </motion.header>
      <section className="mb-8 md:mb-10"><MetricRow kpis={firm.firmKpis} locale={locale} /></section>
      <section className="mb-8 md:mb-10"><DeptHeatStrip departments={firm.departments} title={t('deptHeat')} subtitle={t('deptHeatSub')} /></section>
      <section className="mb-8 md:mb-10 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <ActivityTrail events={firm.globalActivity} locale={locale} title={t('executionLog')} subtitle={t('executionLogSub')} showDept maxHeight={420} />
        <InterventionQueue interventions={firm.globalInterventions} locale={locale} title={t('interventionsRequired')} subtitle={t('interventionsRequiredSub')} />
      </section>
      <section><ChartPanel chart={firm.trend} locale={locale} height={280} /></section>
    </PageShell>
  )
}
