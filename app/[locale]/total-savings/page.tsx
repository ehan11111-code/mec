'use client'
import { useLocale, useTranslations } from 'next-intl'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { MetricRow } from '@/components/MetricCard'
import { ChartPanel } from '@/components/ChartPanel'
import { Panel } from '@/components/Panel'
import { getSavings } from '@/lib/mock/savings'

export default function TotalSavingsPage() {
  const tNav = useTranslations('nav'); const tSav = useTranslations('savings'); const locale = useLocale() as 'en' | 'ar'
  const s = getSavings()
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('totalSavings') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{tSav('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{tSav('headline', { value: s.headlineSaved })}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{tSav('subline')}</p>
      </header>
      <section className="mb-8 md:mb-10"><MetricRow kpis={s.kpis} locale={locale} /></section>
      <section className="mb-8 md:mb-10"><ChartPanel chart={s.comparison} locale={locale} height={300} /></section>
      <section>
        <Panel title={tSav('breakdown')} subtitle={tSav('breakdownSub')} bodyClassName="px-0 pb-0">
          <div className="overflow-x-auto scrollbar-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="text-start font-medium px-5 md:px-6 py-3">{tSav('colDept')}</th>
                  <th className="text-end font-medium px-4 py-3">{tSav('colBefore')}</th>
                  <th className="text-end font-medium px-4 py-3">{tSav('colAfter')}</th>
                  <th className="text-end font-medium px-4 py-3">{tSav('colSaved')}</th>
                  <th className="text-end font-medium px-5 md:px-6 py-3">{tSav('colHours')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {s.breakdown.map((r, i) => (
                  <tr key={i} className="hover:bg-surface-elev transition-colors">
                    <td className="px-5 md:px-6 py-3 text-text">{r.dept[locale]}</td>
                    <td className="px-4 py-3 text-end tabular-nums text-muted">{r.before}</td>
                    <td className="px-4 py-3 text-end tabular-nums text-text-soft">{r.after}</td>
                    <td className="px-4 py-3 text-end tabular-nums text-accent font-medium">{r.saved}</td>
                    <td className="px-5 md:px-6 py-3 text-end tabular-nums text-text-soft">{r.hoursReclaimed}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </PageShell>
  )
}
