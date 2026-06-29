'use client'
import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Activity, Brain, FileWarning, RefreshCw, CheckCircle2, AlertTriangle, Radio, Cpu, ShieldCheck, Calculator } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { StatCard } from '@/components/StatCard'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { fmtAgo } from '@/lib/format/datetime'
import { useCurrentUser } from '@/lib/auth/useCurrentUser'

type Stats = { total: number; captured: number; understood: number; acted: number; highImportance: number; mediaPending: number; mediaCached: number; mediaFailed: number; extractDone: number; extractFailed: number; captureRate: number; understandRate: number; extractRate: number; accuracyScore: number; lastMessageAt: string | null }
type Feed = { message_id: string; received_at: string; who: string | null; type: string; importance: 'high' | 'medium' | 'low'; action: string | null; summary: string; doc_type: string | null; intent: string | null; media_status: string | null; extract_status: string | null; understood: boolean }
type Cockpit = { stats: Stats; feed: Feed[]; interpretation: string[] }
type Health = { intakeActive: boolean | null; lastMessageAt: string | null; hoursSinceLastMessage: number | null; workers: { id: string; beat_at: string; processed: number; failed: number; stale: boolean }[] }

const IMP = { high: 'bg-accent-soft text-accent', medium: 'bg-warn-soft text-warn', low: 'bg-bg-soft text-muted' } as const

export default function JarvisCockpitPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('jarvis'); const locale = useLocale() as 'en' | 'ar'
  const { can } = useCurrentUser()
  const [c, setC] = useState<Cockpit | null>(null)
  const [h, setH] = useState<Health | null>(null)
  const [running, setRunning] = useState(false)

  const load = useCallback(() => {
    fetch('/api/jarvis/cockpit', { cache: 'no-store' }).then(r => r.json()).then(d => { if (d.stats) setC(d) }).catch(() => {})
    fetch('/api/ingest/health', { cache: 'no-store' }).then(r => r.json()).then(setH).catch(() => {})
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  const runRead = async () => {
    setRunning(true)
    try { await fetch('/api/admin/reprocess?auto=1', { method: 'POST' }); } catch {}
    setTimeout(() => { load(); setRunning(false) }, 1200)
  }

  const s = c?.stats
  const scoreTone = (n: number) => n >= 90 ? 'text-success' : n >= 70 ? 'text-warn' : 'text-accent'

  return (
    <PageShell requires="analytics" breadcrumbs={[{ label: tNav('secIntel') }, { label: tNav('jarvis') }]}>
      <header className="mb-7 max-w-3xl">
        <Eyebrow accent>{t('cockEyebrow')}</Eyebrow>
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('cockTitle')}</DisplayHeading>
          {can('manageData') && (
            <button type="button" onClick={runRead} disabled={running}
              className="inline-flex items-center gap-2 rounded-soft border border-border bg-surface px-3 py-2 text-sm text-text-soft hover:text-text hover:border-accent/40 transition-colors disabled:opacity-60">
              <RefreshCw className={clsx('h-4 w-4', running && 'animate-spin')} strokeWidth={1.8} />{running ? t('reading') : t('runRead')}
            </button>
          )}
        </div>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('cockSub')}</p>
      </header>

      {/* Accuracy & reliability KPIs */}
      <section className="mb-7 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kAccuracy')} value={s ? `${s.accuracyScore}%` : '—'} accent delta={t('kAccuracySub')} index={0} />
        <StatCard label={t('kUnderstood')} value={s ? `${s.understood}/${s.total}` : '—'} delta={s ? `${s.understandRate}% · ${s.highImportance} ${t('high')}` : ''} index={1} />
        <StatCard label={t('kExtraction')} value={s ? `${s.extractRate}%` : '—'} delta={s ? `${s.mediaCached} ${t('cached')} · ${s.mediaPending} ${t('pending')} · ${s.mediaFailed} ${t('failed')}` : ''} accent index={2} />
        <StatCard label={t('kActed')} value={s ? String(s.acted) : '—'} delta={t('kActedSub')} index={3} />
      </section>

      {/* How every number is calculated — the proof behind each figure */}
      <Panel className="mb-6" bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><Calculator className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('mTitle')}</span>} subtitle={t('mSub')}>
        {s ? (() => {
          const mediaTotal = s.mediaCached + s.mediaPending + s.mediaFailed
          const metrics = [
            { l: t('kAccuracy'), v: `${s.accuracyScore}%`, f: t('m_acc_f', { u: s.understandRate, e: s.extractRate, score: s.accuracyScore }), m: t('m_acc_m', { score: s.accuracyScore, u: s.understandRate }) },
            { l: t('kUnderstood'), v: `${s.understood}/${s.total}`, f: t('m_read_f', { u: s.understood, t: s.total, pct: s.understandRate, pend: s.total - s.understood }), m: t('m_read_m') },
            { l: t('kExtraction'), v: `${s.extractRate}%`, f: t('m_ext_f', { c: s.mediaCached, total: mediaTotal, pend: s.mediaPending, fail: s.mediaFailed }), m: t('m_ext_m') },
            { l: t('kActed'), v: String(s.acted), f: t('m_act_f', { n: s.acted }), m: t('m_act_m') },
          ]
          return (
            <ul className="divide-y divide-border">
              {metrics.map((x, i) => (
                <li key={i} className="px-5 md:px-6 py-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-text">{x.l}</span>
                    <span className="text-sm font-semibold tabular-nums text-accent">{x.v}</span>
                  </div>
                  <p className="mt-1 text-xs text-text-soft leading-snug" dir="auto"><span className="text-muted">=</span> {x.f}</p>
                  <p className="mt-1 text-[11px] text-muted leading-snug" dir="auto">{x.m}</p>
                </li>
              ))}
            </ul>
          )
        })() : <p className="px-5 py-8 text-center text-sm text-muted">{t('loading')}</p>}
      </Panel>

      {/* Reliability panel */}
      <section className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <Panel title={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('relTitle')}</span>} subtitle={t('relSub')}>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-text-soft"><Radio className="h-4 w-4 text-muted" strokeWidth={1.8} />{t('intake')}</span>
              {h?.intakeActive === false
                ? <span className="inline-flex items-center gap-1 text-accent text-xs font-medium"><AlertTriangle className="h-3.5 w-3.5" />{t('intakeOff')}</span>
                : <span className="inline-flex items-center gap-1 text-success text-xs font-medium"><CheckCircle2 className="h-3.5 w-3.5" />{h?.intakeActive == null ? '—' : t('intakeOn')}</span>}
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-text-soft"><Activity className="h-4 w-4 text-muted" strokeWidth={1.8} />{t('lastMsg')}</span>
              <span className="text-xs text-muted tabular-nums">{fmtAgo(h?.lastMessageAt || s?.lastMessageAt, locale)}</span>
            </li>
            <li className="pt-1 border-t border-border">
              <span className="inline-flex items-center gap-2 text-text-soft mb-2"><Cpu className="h-4 w-4 text-muted" strokeWidth={1.8} />{t('workers')}</span>
              {h && h.workers.length ? (
                <ul className="space-y-1.5">
                  {h.workers.map(w => (
                    <li key={w.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-1.5"><span className={clsx('h-1.5 w-1.5 rounded-full', w.stale ? 'bg-accent' : 'bg-success animate-pulse')} />{w.id}</span>
                      <span className="text-muted tabular-nums">{fmtAgo(w.beat_at, locale)} · {w.processed}✓ {w.failed}✗</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-muted">{t('noWorker')}</p>}
            </li>
          </ul>
        </Panel>

        {/* Interpretation */}
        <div className="lg:col-span-2">
          <Panel title={<span className="inline-flex items-center gap-2"><Brain className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('interpTitle')}</span>} subtitle={t('interpSub')}>
            {c?.interpretation?.length ? (
              <ul className="space-y-2.5">
                {c.interpretation.map((line, i) => (
                  <li key={i} className={clsx('flex items-start gap-2 text-sm', line.startsWith('⚠') ? 'text-accent' : 'text-text-soft')}>
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent/50 shrink-0" />{line.replace(/^⚠\s*/, '')}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">{t('loading')}</p>}
            {s && s.mediaFailed > 0 && <NoteCallout className="mt-4" tone="warn" title={t('throttleTitle')}>{t('throttleBody')}</NoteCallout>}
          </Panel>
        </div>
      </section>

      {/* What's flowing through */}
      <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><FileWarning className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('feedTitle')}</span>} subtitle={t('feedSub')}>
        <ul className="divide-y divide-border">
          {(c?.feed || []).map(f => (
            <li key={f.message_id} className="px-5 md:px-6 py-3 flex items-start gap-3">
              <span className={clsx('shrink-0 mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', IMP[f.importance])}>{f.type}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {f.who && <span className="text-sm text-text font-medium truncate">{f.who}</span>}
                  <span className="text-[11px] text-muted tabular-nums">{fmtAgo(f.received_at, locale)}</span>
                  {!f.understood && <span className="text-[10px] text-warn">· {t('unread')}</span>}
                </div>
                <p className="text-sm text-text-soft truncate">{f.summary || '—'}</p>
                {f.action && f.action.toLowerCase() !== 'none' && <p className="text-[11px] text-accent mt-0.5">→ {f.action}</p>}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                {f.media_status && <span className={clsx('text-[10px] rounded px-1.5 py-0.5', f.media_status === 'cached' ? 'bg-success-soft text-success' : f.media_status === 'failed' ? 'bg-accent-soft text-accent' : 'bg-bg-soft text-muted')}>{f.media_status}</span>}
                {f.extract_status === 'done' && <span className="text-[10px] rounded px-1.5 py-0.5 bg-success-soft text-success">{t('extracted')}</span>}
              </div>
            </li>
          ))}
          {!c?.feed?.length && <li className="px-5 md:px-6 py-10 text-center text-sm text-muted">{t('loading')}</li>}
        </ul>
      </Panel>

      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('cockFoot')}</p>
    </PageShell>
  )
}
