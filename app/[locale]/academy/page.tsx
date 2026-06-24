'use client'
import { useLocale, useTranslations } from 'next-intl'
import { BookOpen, PlayCircle, FileText, Wrench } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'

export default function AcademyPage() {
  const tNav = useTranslations('nav'); const tAcad = useTranslations('academy'); const locale = useLocale() as 'en' | 'ar'
  const cards = [
    { icon: PlayCircle, key: 'gettingStarted' },
    { icon: BookOpen, key: 'approvals' },
    { icon: FileText, key: 'documents' }
  ]
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('academy') }]}>
      <header className="mb-6 max-w-3xl">
        <div className="flex items-center gap-3 flex-wrap">
          <Eyebrow accent>{tAcad('eyebrow')}</Eyebrow>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft text-warn px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            <Wrench className="h-3 w-3" strokeWidth={2} />{tAcad('betaBadge')}
          </span>
        </div>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{tAcad('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{tAcad('subline')}</p>
      </header>
      <NoteCallout className="mb-6" tone="warn" title={tAcad('maintenanceTitle')}>{tAcad('maintenanceBody')}</NoteCallout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {cards.map(c => {
          const Icon = c.icon
          return (
            <Panel key={c.key} className="opacity-90">
              <span className="inline-flex items-center justify-center h-10 w-10 rounded-soft bg-accent-soft text-accent mb-4"><Icon className="h-5 w-5" strokeWidth={1.6} /></span>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text">{tAcad(`${c.key}Title`)}</h3>
                <span className="inline-flex items-center rounded-full bg-bg-soft text-muted px-2 py-0.5 text-[10px] font-medium">{tAcad('soon')}</span>
              </div>
              <p className="mt-2 text-sm text-text-soft leading-relaxed">{tAcad(`${c.key}Body`)}</p>
            </Panel>
          )
        })}
      </div>
    </PageShell>
  )
}
