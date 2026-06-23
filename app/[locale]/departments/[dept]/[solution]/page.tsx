'use client'
import { use } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import { ArrowLeft, Activity } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { WorkflowDiagram } from '@/components/WorkflowDiagram'
import { StatusPulse } from '@/components/StatusPulse'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { InfoTooltip } from '@/components/InfoTooltip'
import { getSolution } from '@/lib/mock/data'

export default function SolutionPage({ params }: { params: Promise<{ dept: string; solution: string }> }) {
  const { dept: deptSlug, solution: solSlug } = use(params)
  const tNav = useTranslations('nav'); const tSol = useTranslations('solution'); const tCommon = useTranslations('common')
  const locale = useLocale() as 'en' | 'ar'
  const result = getSolution(deptSlug, solSlug)
  if (!result) notFound()
  const { dept, solution } = result
  const systems = solution.integratedSystems.join(' · ')

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

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <StatusPulse status="planned" />
        <span className="text-xs text-muted">{tCommon('notConnected')}</span>
        <span className="text-muted">·</span>
        <div className="flex flex-wrap gap-1.5">
          {solution.integratedSystems.map(s => (
            <span key={s} className="inline-flex items-center rounded-full border border-border bg-bg-soft px-2.5 py-0.5 text-[11px] text-text-soft">{s}</span>
          ))}
        </div>
      </div>

      <NoteCallout tone="info" title={tSol('requirementTitle')} className="mb-8">{solution.context[locale]}</NoteCallout>

      <section className="mb-8 md:mb-10">
        <h2 className="text-sm font-semibold text-text mb-4">{tSol('plannedMetrics')}</h2>
        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
          {solution.kpis.map((kpi, i) => (
            <div key={i} className="rounded-soft border border-border bg-surface shadow-soft p-5 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted leading-tight">
                {kpi.label[locale]}
                <InfoTooltip def={{ en: `Planned metric — will be measured once this module is connected.`, ar: 'مؤشر مخطّط — سيُقاس بمجرد ربط هذه الوحدة.' }}
                  source={{ en: `Will draw from: ${systems}.`, ar: `سيُستمد من: ${systems}.` }} />
              </div>
              <div className="font-display font-semibold text-3xl text-muted leading-none">{kpi.value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 md:mb-10">
        <WorkflowDiagram workflow={solution.workflow} title={tSol('workflow')} subtitle={tSol('workflowSub')} />
      </section>

      <section className="mb-8 md:mb-10">
        <div className="rounded-soft border border-border bg-surface shadow-soft">
          <EmptyState icon={Activity} title={tSol('noActivity')} hint={tSol('noActivityHint')} source={`${tCommon('integratedSystems')}: ${systems}`} />
        </div>
      </section>

      <footer className="border-t border-border pt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>{tCommon('moduleId')} · {solution.slug}</span><span>·</span><span>{tCommon('deployed')} {solution.deployedOn}</span>
      </footer>
    </PageShell>
  )
}
