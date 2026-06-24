'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Clock, Zap, Workflow, ShieldCheck } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { automations } from '@/lib/automations/registry'

// Admin tunes cadence + enable per workflow; stored client-side for the demo (real values live in n8n).
const CADENCES = [1, 3, 6, 12, 24, 168]
const LS_CAD = 'mec_auto_cadence'
const LS_EN = 'mec_auto_enabled'
function readMap(k: string): Record<string, number | boolean> { if (typeof window === 'undefined') return {}; try { return JSON.parse(localStorage.getItem(k) || '{}') } catch { return {} } }
function writeMap(k: string, m: Record<string, number | boolean>) { if (typeof window !== 'undefined') localStorage.setItem(k, JSON.stringify(m)) }

export default function AutomationsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('automations'); const locale = useLocale() as 'en' | 'ar'
  const [cad, setCad] = useState<Record<string, number | boolean>>({})
  const [en, setEn] = useState<Record<string, number | boolean>>({})
  useEffect(() => { setCad(readMap(LS_CAD)); setEn(readMap(LS_EN)) }, [])

  const cadenceOf = (id: string, def?: number) => Number(cad[id] ?? def ?? 12)
  const enabledOf = (id: string, def: boolean) => (id in en ? Boolean(en[id]) : def)
  const setCadence = (id: string, h: number) => setCad(prev => { const m = { ...prev, [id]: h }; writeMap(LS_CAD, m); return m })
  const toggle = (id: string, v: boolean) => setEn(prev => { const m = { ...prev, [id]: v }; writeMap(LS_EN, m); return m })
  const cadenceLabel = (h: number) => h >= 168 ? t('weekly') : h >= 24 ? t('daily') : t('everyHours', { n: h })

  const live = automations.filter(a => a.status === 'live').length

  return (
    <PageShell requires="automations" breadcrumbs={[{ label: tNav('admin') }, { label: tNav('automations') }]}>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-sm text-text-soft mt-2 leading-relaxed">{t('sublineAdmin')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} /><span className="text-text-soft">{t('adminOnly')}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /><span className="text-text-soft">{t('liveCount', { n: live, total: automations.length })}</span>
          </span>
        </div>
      </header>

      <NoteCallout className="mb-6" title={t('noManualTitle')}>{t('noManualBody')}</NoteCallout>

      {(['internal', 'external'] as const).map(kind => (
        <section key={kind} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text">{t(kind)}</h2>
            <span className="text-xs text-muted">{t(`${kind}Sub`)}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {automations.filter(a => a.kind === kind).map(a => {
              const isLive = a.status === 'live'
              const enabled = enabledOf(a.id, isLive)
              return (
                <Panel key={a.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-soft bg-accent-soft text-accent"><Workflow className="h-4.5 w-4.5" strokeWidth={1.7} /></span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-text leading-snug">{a.name[locale]}</h3>
                        <p className="text-[11px] text-muted mt-0.5">{t('phase')} {a.phase}</p>
                      </div>
                    </div>
                    <span className={clsx('shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', isLive ? 'bg-success-soft text-success' : 'bg-bg-soft text-muted')}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', isLive ? 'bg-success' : 'bg-muted')} />{isLive ? t('live') : t('planned')}
                    </span>
                  </div>

                  <ol className="mt-4 space-y-1.5">
                    {a.steps.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-text-soft">
                        <span className="shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full bg-bg-soft text-[10px] text-muted tabular-nums">{i + 1}</span>
                        {s[locale]}
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 border-t border-border pt-3 flex items-center justify-between gap-3">
                    {a.triggerKind === 'schedule' ? (
                      <label className="inline-flex items-center gap-2 text-xs text-text-soft">
                        <Clock className="h-3.5 w-3.5 text-muted" strokeWidth={1.8} />{t('runs')}
                        <select value={cadenceOf(a.id, a.cadenceHours)} onChange={e => setCadence(a.id, Number(e.target.value))}
                          className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-text focus:border-accent transition-colors cursor-pointer">
                          {CADENCES.map(h => <option key={h} value={h}>{cadenceLabel(h)}</option>)}
                        </select>
                      </label>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-text-soft"><Zap className="h-3.5 w-3.5 text-muted" strokeWidth={1.8} />{a.trigger[locale]}</span>
                    )}

                    <button type="button" role="switch" aria-checked={enabled} onClick={() => toggle(a.id, !enabled)}
                      className={clsx('relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors', enabled ? 'bg-accent' : 'bg-border')}>
                      <span className={clsx('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', enabled ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0.5 rtl:-translate-x-0.5')} />
                    </button>
                  </div>
                </Panel>
              )
            })}
          </div>
        </section>
      ))}
    </PageShell>
  )
}
