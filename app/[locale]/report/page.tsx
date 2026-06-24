'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Printer, Sparkles, ArrowLeft, FileText } from 'lucide-react'
import { Link, useRouter } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { printReport } from '@/lib/export/exporters'
import type { ReportSpec } from '@/lib/report/builders'

export default function ReportViewerPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('report'); const locale = useLocale() as 'en' | 'ar'
  const router = useRouter()
  const [spec, setSpec] = useState<ReportSpec | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try { const raw = sessionStorage.getItem('mec_report'); if (raw) setSpec(JSON.parse(raw)) } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  const fmtDate = (s: string) => { try { return new Date(s).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '' } }

  if (loaded && !spec) {
    return (
      <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: t('title') }]}>
        <div className="flex flex-col items-center justify-center text-center gap-3 py-24">
          <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-bg-soft text-muted"><FileText className="h-5 w-5" strokeWidth={1.6} /></span>
          <p className="text-sm text-text-soft">{t('noReport')}</p>
          <Link href="/control-center" className="text-xs text-accent hover:underline">{t('back')}</Link>
        </div>
      </PageShell>
    )
  }
  if (!spec) return <PageShell breadcrumbs={[]}><div /></PageShell>

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: t('title') }]}>
      <div data-print-header className="hidden items-center justify-between mb-6 pb-4 border-b">
        <div><div className="text-lg font-bold">MEC · {spec.title}</div><div className="text-xs">{spec.period ? spec.period + ' · ' : ''}{fmtDate(spec.generatedAt)}</div></div>
        <div className="text-xs">JARVIS · Jarvis AI</div>
      </div>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="max-w-2xl">
          <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-3">
            <ArrowLeft className="h-3.5 w-3.5 flip-rtl" strokeWidth={1.7} />{t('back')}
          </button>
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="md" className="mt-2" locale={locale}>{spec.title}</DisplayHeading>
          <p className="text-xs text-muted mt-2">{spec.period ? spec.period + ' · ' : ''}{fmtDate(spec.generatedAt)}</p>
        </div>
        <button type="button" onClick={printReport} className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2 text-xs font-medium hover:bg-accent-strong transition-colors">
          <Printer className="h-3.5 w-3.5" strokeWidth={1.9} />{t('print')}
        </button>
      </header>

      <div className="space-y-5">
        {spec.sections.map(sec => (
          <Panel key={sec.id} title={sec.heading}>
            {sec.stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                {sec.stats.map((s, i) => (
                  <div key={i} className="rounded-soft border border-border bg-bg-soft px-3 py-2.5">
                    <div className="text-[11px] text-muted leading-tight">{s.label}</div>
                    <div className="text-sm font-display font-semibold tabular-nums text-text mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>
            )}
            {sec.table && (
              <div className="overflow-x-auto scrollbar-soft">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-muted border-b border-border">
                    {sec.table.columns.map((c, i) => <th key={i} className={`font-medium py-2 px-3 ${i === 0 ? 'text-start' : 'text-end'}`}>{c}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-border">
                    {sec.table.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => <td key={j} className={`py-2 px-3 tabular-nums ${j === 0 ? 'text-start text-text max-w-[280px] truncate' : 'text-end text-text-soft'}`}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {sec.note && <p className="text-xs text-muted mt-2 leading-relaxed">{sec.note}</p>}
          </Panel>
        ))}

        {spec.suggestions && spec.suggestions.length > 0 && (
          <Panel title={<span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('suggestions')}</span>} subtitle={t('suggestionsSub')}>
            <ul className="space-y-3">
              {spec.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent-soft text-accent text-[11px] font-semibold tabular-nums mt-0.5">{i + 1}</span>
                  <div><span className="text-sm font-medium text-text">{s.area}</span><p className="text-sm text-text-soft leading-relaxed">{s.text}</p></div>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </PageShell>
  )
}
