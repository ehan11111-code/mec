'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Play, Loader2, CheckCircle2, Plug, Workflow } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { automations, webhookUrls } from '@/lib/automations/registry'

type RunState = 'idle' | 'running' | 'ok' | 'unconfigured'

export default function AutomationsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('automations'); const locale = useLocale() as 'en' | 'ar'
  const [state, setState] = useState<Record<string, RunState>>({})
  const [last, setLast] = useState<Record<string, string>>({})

  const run = async (id: string, env: string) => {
    const url = webhookUrls[env]
    if (!url) { setState(s => ({ ...s, [id]: 'unconfigured' })); return }
    setState(s => ({ ...s, [id]: 'running' }))
    try {
      await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'mec-portal', automation: id, ts: new Date().toISOString() }) })
    } catch { /* fire-and-forget in demo */ }
    setState(s => ({ ...s, [id]: 'ok' }))
    setLast(l => ({ ...l, [id]: new Date().toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit' }) }))
    setTimeout(() => setState(s => ({ ...s, [id]: 'idle' })), 2600)
  }

  const configured = automations.filter(a => webhookUrls[a.webhookEnv]).length

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('automations') }]}>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-sm text-text-soft mt-2 leading-relaxed">{t('subline')}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs">
          <Plug className={clsx('h-3.5 w-3.5', configured ? 'text-success' : 'text-muted')} strokeWidth={1.8} />
          <span className="text-text-soft">{t('connected', { n: configured, total: automations.length })}</span>
        </div>
      </header>

      {(['internal', 'external'] as const).map(kind => (
        <section key={kind} className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text">{t(kind)}</h2>
            <span className="text-xs text-muted">{t(`${kind}Sub`)}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {automations.filter(a => a.kind === kind).map(a => {
          const st = state[a.id] ?? 'idle'; const isConfigured = !!webhookUrls[a.webhookEnv]
          return (
            <Panel key={a.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-soft bg-accent-soft text-accent"><Workflow className="h-4.5 w-4.5" strokeWidth={1.7} /></span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-text leading-snug">{a.name[locale]}</h3>
                    <p className="text-xs text-muted mt-0.5">{t('trigger')}: {a.trigger[locale]}</p>
                  </div>
                </div>
                <span className={clsx('shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', isConfigured ? 'bg-success-soft text-success' : 'bg-bg-soft text-muted')}>
                  <span className={clsx('h-1.5 w-1.5 rounded-full', isConfigured ? 'bg-success' : 'bg-muted')} />{isConfigured ? t('live') : t('notConnected')}
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

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="text-xs text-muted">{last[a.id] ? `${t('lastRun')} · ${last[a.id]}` : t('neverRun')}</span>
                <button type="button" onClick={() => run(a.id, a.webhookEnv)} disabled={st === 'running'}
                  className={clsx('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                    st === 'ok' ? 'bg-success text-white' : st === 'unconfigured' ? 'bg-warn-soft text-warn' : 'bg-accent text-white hover:bg-accent-strong disabled:opacity-60')}>
                  {st === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                    : st === 'ok' ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      : <Play className="h-3.5 w-3.5" strokeWidth={2} />}
                  {st === 'ok' ? t('triggered') : st === 'unconfigured' ? t('connectFirst') : st === 'running' ? t('running') : t('run')}
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
