'use client'
import { use } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { SolutionStatusCard } from '@/components/SolutionStatusCard'
import { NoteCallout } from '@/components/NoteCallout'
import { getDepartment } from '@/lib/mock/data'

export default function DepartmentPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept: deptSlug } = use(params)
  const tNav = useTranslations('nav'); const tDept = useTranslations('dept'); const locale = useLocale() as 'en' | 'ar'
  const dept = getDepartment(deptSlug)
  if (!dept) notFound()
  return (
    <PageShell breadcrumbs={[{ label: tNav('departments') }, { label: dept.name[locale] }]}>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{tDept('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{dept.name[locale]}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{dept.contextLine[locale]}</p>
      </header>
      <NoteCallout tone="info" title={tDept('requirementTitle')} className="mb-8 max-w-3xl">{tDept('requirementBody')}</NoteCallout>
      <section className="mb-8 md:mb-10">
        <h2 className="text-sm font-semibold text-text mb-4">{tDept('modules')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {dept.solutions.map((s, i) => <SolutionStatusCard key={s.slug} solution={s} deptSlug={dept.slug} locale={locale} index={i} />)}
        </div>
      </section>
    </PageShell>
  )
}
