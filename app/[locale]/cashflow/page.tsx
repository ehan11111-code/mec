'use client'
import { useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { NoteCallout } from '@/components/NoteCallout'
import { BarChartPanel } from '@/components/BarChartPanel'
import { collectionsSummary, getPurchases, fmtSAR } from '@/lib/data/dataset'
import { getCredit } from '@/lib/data/credit'

export default function CashflowPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('cashflow'); const locale = useLocale() as 'en' | 'ar'
  const credit = useMemo(() => getCredit(), [])
  const col = useMemo(() => collectionsSummary(), [])
  const payables = useMemo(() => getPurchases().reduce((s, p) => s + (Number(p.remaining) || 0), 0), [])

  const receivables = credit.total
  const net = receivables - payables
  const agingBars = [
    { label: t('b_current'), value: Math.round(credit.buckets.current), accent: true },
    { label: t('b_8_30'), value: Math.round(credit.buckets.d8_30) },
    { label: t('b_31_60'), value: Math.round(credit.buckets.d31_60) },
    { label: t('b_60'), value: Math.round(credit.buckets.over60) }
  ]

  return (
    <PageShell requires="finance" breadcrumbs={[{ label: tNav('secFinance') }, { label: tNav('cashflow') }]}>
      <header className="mb-7 max-w-2xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      <section className="mb-7 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kCollected')} value={fmtSAR(col.collected)} delta={t('kCollectedSub')} index={0} />
        <StatCard label={t('kReceivable')} value={fmtSAR(receivables)} delta={t('asOf', { date: credit.asOf })} index={1} accent />
        <StatCard label={t('kPayable')} value={fmtSAR(payables)} delta={payables > 0 ? undefined : t('noPayables')} index={2} />
        <StatCard label={t('kNet')} value={fmtSAR(net)} delta={t('kNetSub')} index={3} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <BarChartPanel title={t('agingTitle')} subtitle={t('agingSub')} data={agingBars} locale={locale} valueFormat="sar" valueLabel={t('kReceivable')} height={280} />
        </div>

        <Panel title={t('flowsTitle')}>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-soft bg-success-soft/40 px-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-success"><ArrowDownRight className="h-4 w-4" strokeWidth={2} />{t('inflow')}</span>
              <span className="font-semibold tabular-nums text-text">{fmtSAR(receivables)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-soft bg-accent-soft/40 px-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-accent"><ArrowUpRight className="h-4 w-4" strokeWidth={2} />{t('outflow')}</span>
              <span className="font-semibold tabular-nums text-text">{fmtSAR(payables)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-soft border border-border px-3 py-2.5">
              <span className="inline-flex items-center gap-2 text-text-soft"><Scale className="h-4 w-4" strokeWidth={2} />{t('projected')}</span>
              <span className={clsxNet(net)}>{fmtSAR(net)}</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed pt-1">{t('overdueLine', { amt: fmtSAR(credit.overdueAmount) })}</p>
          </div>
        </Panel>
      </div>

      <NoteCallout className="mt-6" title={t('noteTitle')}>{t('note')}</NoteCallout>
    </PageShell>
  )
}

// Net position colour: positive = success, negative = accent (attention).
function clsxNet(n: number): string {
  return `font-bold tabular-nums ${n >= 0 ? 'text-success' : 'text-accent'}`
}
