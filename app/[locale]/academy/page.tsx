'use client'
import { useLocale, useTranslations } from 'next-intl'
import { BookOpen, PlayCircle, FileText } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'

export default function AcademyPage() {
  const tNav = useTranslations('nav'); const tAcad = useTranslations('academy'); const locale = useLocale() as 'en' | 'ar'
  const cards = [
    { icon: PlayCircle, key: 'gettingStarted' },
    { icon: BookOpen, key: 'approvals' },
    { icon: FileText, key: 'documents' }
  ]
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('academy') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{tAcad('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{tAcad('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{tAcad('subline')}</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <Panel key={c.key}>
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-soft bg-accent-soft text-accent mb-4"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
              <h3 className="text-base font-semibold text-text">{tAcad(`${c.key}Title`)}</h3>
              <p className="mt-2 text-sm text-text-soft leading-relaxed">{tAcad(`${c.key}Body`)}</p>
            </Panel>
          )
        })}
      </div>
    </PageShell>
  )
}
