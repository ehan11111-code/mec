'use client'
import { use } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { MetricRow } from '@/components/MetricCard'
import { ChartPanel } from '@/components/ChartPanel'
import { DecisionFeed } from '@/components/DecisionFeed'
import { InterventionQueue } from '@/components/InterventionQueue'
import { WorkflowDiagram } from '@/components/WorkflowDiagram'
import { ActivityTrail } from '@/components/ActivityTrail'
import { StatusPulse } from '@/components/StatusPulse'
import { getSolution } from '@/lib/mock/data'

export default function SolutionPage({ params }: { params: Promise<{ dept: string; solution: string }> }) {
  const { dept: deptSlug, solution: solSlug } = use(params)
  const tNav = useTranslations('nav'); const tSol = useTranslations('solution'); const tCommon = useTranslations('common')
  const locale = useLocale() as 'en' | 'ar'
  const result = getSolution(deptSlug, solSlug)
  if (!result) notFound()
  const { dept, solution } = result
  return (
    <PageShell breadcrumbs={[{ label: tNav('departments') }, { label: dept.name[locale] }, { label: solution.name[locale] }]}>
      <header className="mb-6 max-w-3xl">
        <Link href={`/departments/${dept.slug}`} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5 flip-rtl" strokeWidth={1.7} />{tSol('backTo', { dept: dept.name[locale] })}
        </Link>
        <Eyebrow accent>{dept.name[locale]}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{solution.name[locale]}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{solution.context[locale]}</p>
      </header>
      <div className="flex flex-wrap items-center gap-3 mb-8">
        <StatusPulse status={solution.status} />
        <span className="text-xs text-muted">{tCommon('lastRun')} · {solution.lastRun}</span>
        <span className="text-muted">·</span>
        <div className="flex flex-wrap gap-1.5">
          {solution.integratedSystems.map(s => (
            <span key={s} className="inline-flex items-center rounded-full border border-border bg-bg-soft px-2.5 py-0.5 text-[11px] text-text-soft">{s}</span>
          ))}
        </div>
      </div>
      <section className="mb-8 md:mb-10"><MetricRow kpis={solution.kpis} locale={locale} /></section>
      <section className="mb-8 md:mb-10"><ChartPanel chart={solution.chart} locale={locale} height={300} /></section>
      <section className="mb-8 md:mb-10 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <DecisionFeed decisions={solution.decisions} locale={locale} title={tSol('decisions')} subtitle={tSol('decisionsSub')} />
        <InterventionQueue interventions={solution.interventions} locale={locale} title={tSol('interventions')} subtitle={tSol('interventionsSub')} />
      </section>
      <section className="mb-8 md:mb-10"><WorkflowDiagram workflow={solution.workflow} title={tSol('workflow')} subtitle={tSol('workflowSub')} /></section>
      <section className="mb-8 md:mb-10"><ActivityTrail events={solution.activity} locale={locale} title={tSol('activity')} maxHeight={360} /></section>
      <footer className="border-t border-border pt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{tCommon('moduleId')} · {solution.slug}</span><span>·</span><span>{tCommon('deployed')} {solution.deployedOn}</span>
      </footer>
    </PageShell>
  )
}
