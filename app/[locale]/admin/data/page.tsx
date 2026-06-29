'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Database, RefreshCw, Loader2, MessageCircle, Mail, Radar, AlertTriangle, CheckCircle2, Circle, Users2, Wand2, Sparkles, ArrowRight, Check } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { fmtDateTime } from '@/lib/format/datetime'
import type { DataItem } from '@/app/api/admin/data/route'
import type { ReprocessChange } from '@/lib/data/reprocess'

type Counts = { total: number; whatsapp: number; email: number; supply: number; captured: number; notCaptured: number; understood: number; possibleOrders: number }
const SRC_ICON = { whatsapp: MessageCircle, email: Mail, supply: Radar } as const
const SRC_TONE = { whatsapp: 'text-success', email: 'text-accent', supply: 'text-warn' } as const

export default function AdminDataPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('adminData'); const locale = useLocale() as 'en' | 'ar'
  const [data, setData] = useState<{ items: DataItem[]; counts: Counts } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [src, setSrc] = useState<'all' | 'whatsapp' | 'email' | 'supply'>('all')
  const [onlyUncaptured, setOnlyUncaptured] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  // Smart reprocess (missed orders + corrections)
  const [proposals, setProposals] = useState<ReprocessChange[] | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try { const d = await fetch('/api/admin/data', { cache: 'no-store' }).then(r => r.json()); if (d.items) setData(d) } catch { setData(d => d ?? { items: [], counts: { total: 0, whatsapp: 0, email: 0, supply: 0, captured: 0, notCaptured: 0, understood: 0, possibleOrders: 0 } }) }
    if (manual) setRefreshing(false)
  }, [])
  useEffect(() => { load(); const id = setInterval(() => load(), 30000); return () => clearInterval(id) }, [load])

  const runSmart = useCallback(async () => {
    setAnalyzing(true)
    try { const d = await fetch('/api/admin/reprocess', { cache: 'no-store' }).then(r => r.json()); setProposals(Array.isArray(d.changes) ? d.changes : []) }
    catch { setProposals([]) }
    setAnalyzing(false)
  }, [])

  async function applyProposal(ch: ReprocessChange) {
    setApplyingId(ch.triggerId)
    try {
      const r = await fetch('/api/admin/reprocess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ change: ch }) })
      if (r.ok) { setProposals(ps => (ps || []).filter(p => p.triggerId !== ch.triggerId)); load() }
    } catch { /* ignore */ }
    setApplyingId(null)
  }

  const items = data?.items ?? []
  const counts = data?.counts
  const shown = useMemo(() => items.filter(i => (src === 'all' || i.source === src) && (!onlyUncaptured || !i.captured)), [items, src, onlyUncaptured])

  const srcTabs: { v: typeof src; n?: number }[] = [
    { v: 'all', n: counts?.total }, { v: 'whatsapp', n: counts?.whatsapp }, { v: 'email', n: counts?.email }, { v: 'supply', n: counts?.supply }
  ]

  return (
    <PageShell requires="manageData" breadcrumbs={[{ label: tNav('admin') }, { label: t('title') }]}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('title')}</DisplayHeading>
          <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
        </div>
        <button type="button" onClick={() => load(true)} disabled={refreshing} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={1.9} />{t('refresh')}
        </button>
      </header>

      <section className="mb-6 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kTotal')} value={counts ? String(counts.total) : '—'} index={0} accent />
        <StatCard label={t('kCaptured')} value={counts ? String(counts.captured) : '—'} delta={t('kCapturedSub')} index={1} />
        <StatCard label={t('kNotCaptured')} value={counts ? String(counts.notCaptured) : '—'} delta={t('kNotCapturedSub')} index={2} />
        <StatCard label={t('kMissed')} value={counts ? String(counts.possibleOrders) : '—'} delta={t('kMissedSub')} index={3} accent />
      </section>

      {!!counts?.possibleOrders && (
        <NoteCallout className="mb-6" tone="warn" title={t('missedTitle')}>{t('missedBody', { n: counts.possibleOrders })}</NoteCallout>
      )}

      {/* Smart reprocess — catch missed orders + apply correction messages, live */}
      <Panel className="mb-6" title={<span className="inline-flex items-center gap-2"><Wand2 className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('smartTitle')}</span>} subtitle={t('smartSub')}
        action={
          <button type="button" onClick={runSmart} disabled={analyzing}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-3.5 py-2 text-xs font-medium hover:bg-accent-strong disabled:opacity-60 transition-colors">
            {analyzing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" strokeWidth={1.9} />}{t('runSmart')}
          </button>
        }>
        {proposals === null ? (
          <p className="py-5 text-center text-sm text-muted">{t('smartIdle')}</p>
        ) : proposals.length === 0 ? (
          <p className="py-5 text-center text-sm text-success">{t('smartClean')}</p>
        ) : (
          <ul className="space-y-3">
            {proposals.map(p => (
              <li key={p.triggerId} className="rounded-soft border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', p.kind === 'promote_order' ? 'bg-accent-soft text-accent' : 'bg-warn-soft text-warn')}>{t(p.kind === 'promote_order' ? 'kindOrder' : 'kindCorrection')}</span>
                      <span className="text-[10px] text-muted">{t('conf', { p: Math.round(p.confidence * 100) })}</span>
                      {p.auto && <span className="inline-flex items-center gap-0.5 text-[10px] text-success"><CheckCircle2 className="h-3 w-3" strokeWidth={2} />{t('autoEligible')}</span>}
                    </div>
                    <p className="mt-1.5 text-xs text-text-soft leading-snug" dir="auto">{p.reason}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] flex-wrap" dir="auto">
                      <span className="text-muted line-through decoration-muted/50">{p.before}</span>
                      <ArrowRight className="h-3 w-3 text-accent shrink-0" strokeWidth={2} />
                      <span className="text-text font-medium">{p.after}</span>
                    </div>
                  </div>
                  <button type="button" disabled={applyingId === p.triggerId} onClick={() => applyProposal(p)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-accent text-accent px-3 py-1.5 text-xs font-medium hover:bg-accent-soft disabled:opacity-60 transition-colors">
                    {applyingId === p.triggerId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}{t(p.kind === 'promote_order' ? 'queueOrder' : 'applyFix')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted leading-relaxed">{t('smartNote')}</p>
      </Panel>

      <Panel bodyClassName="px-0 pb-0" title={t('feedTitle')} subtitle={t('feedSub')}
        action={
          <button type="button" onClick={() => setOnlyUncaptured(v => !v)}
            className={clsx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              onlyUncaptured ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.9} />{t('filterUncaptured')}
          </button>
        }>
        <div className="px-5 md:px-6 py-3 flex flex-wrap gap-2 border-b border-border">
          {srcTabs.map(tab => (
            <button key={tab.v} type="button" onClick={() => setSrc(tab.v)}
              className={clsx('rounded-full px-3 py-1 text-xs font-medium border transition-colors', src === tab.v ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>
              {t(`src_${tab.v}`)}{tab.n != null ? ` (${tab.n})` : ''}
            </button>
          ))}
        </div>

        {data === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={Database} title={t('empty')} hint={t('emptyHint')} source={t('source')} />
        ) : (
          <ul className="divide-y divide-border">
            {shown.map(it => {
              const Icon = SRC_ICON[it.source]
              const open = expanded === it.id
              return (
                <li key={it.id} className={clsx('px-5 md:px-6 py-3 transition-colors', it.hint === 'possible_order' ? 'bg-warn-soft/30' : 'hover:bg-surface-elev')}>
                  <div className="flex items-start gap-3">
                    <Icon className={clsx('h-4 w-4 mt-0.5 shrink-0', SRC_TONE[it.source])} strokeWidth={1.8} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted tabular-nums">
                        <span className="text-text-soft font-medium">{fmtDateTime(it.when, locale)}</span>
                        <span className="inline-flex items-center gap-1"><Users2 className="h-3 w-3" strokeWidth={1.8} />{it.channel}</span>
                        <span>· {it.sender}</span>
                        <span className="inline-flex items-center rounded-full bg-bg-soft px-2 py-0.5 text-[10px] text-text-soft">{it.kind}</span>
                        {it.archived && <span className="inline-flex items-center rounded-full bg-bg-soft px-2 py-0.5 text-[10px] text-muted">{t('archived')}</span>}
                      </div>
                      {(it.title || it.body) && (
                        <p className={clsx('mt-1 text-sm text-text leading-snug', !open && 'line-clamp-2')} dir="auto"
                          onClick={() => setExpanded(open ? null : it.id)} role="button">
                          {it.title && <span className="font-medium me-1.5">{it.title}</span>}{it.body}
                        </p>
                      )}
                      {it.understanding && (
                        <p className="mt-1 inline-flex items-start gap-1 text-[11px] text-accent/90" dir="auto"><Sparkles className="h-3 w-3 mt-0.5 shrink-0" strokeWidth={1.9} /><span>{t('jarvisRead')}: {it.understanding}</span></p>
                      )}
                      {it.hint === 'possible_order' && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-warn-soft text-warn px-2 py-0.5 text-[10px] font-medium"><AlertTriangle className="h-3 w-3" strokeWidth={2} />{t('possibleOrder')}</span>
                      )}
                    </div>
                    <span className={clsx('shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium',
                      it.captured ? 'bg-success-soft text-success' : 'bg-bg-soft text-muted')}>
                      {it.captured ? <CheckCircle2 className="h-3 w-3" strokeWidth={2} /> : <Circle className="h-3 w-3" strokeWidth={2} />}
                      {it.captured ? t('captured') : t('notCaptured')}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="px-5 md:px-6 py-3 border-t border-border text-xs text-muted">{t('showing', { n: shown.length, total: items.length })}</div>
      </Panel>

      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('note')}</p>
    </PageShell>
  )
}
