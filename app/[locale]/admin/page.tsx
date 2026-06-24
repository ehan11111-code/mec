'use client'
import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { ShieldAlert, Trash2, Loader2, MessageCircle, Mail, Inbox, RefreshCw, Check } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'

type Counts = { whatsapp: number; contact: number; messages: number }
const ICONS = { whatsapp: MessageCircle, contact: Mail, messages: Inbox } as const

export default function AdminConsolePage() {
  const tNav = useTranslations('nav'); const t = useTranslations('admin'); const locale = useLocale() as 'en' | 'ar'
  const [counts, setCounts] = useState<Counts | null>(null)
  const [configured, setConfigured] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/clear', { cache: 'no-store' })
      if (r.status === 403) { setConfigured(true); setCounts({ whatsapp: 0, contact: 0, messages: 0 }); return }
      const d = await r.json(); setConfigured(d.configured ?? true); if (d.counts) setCounts(d.counts)
    } catch { setCounts({ whatsapp: 0, contact: 0, messages: 0 }) }
  }, [])
  useEffect(() => { load() }, [load])

  const clear = async (target: keyof Counts) => {
    setBusy(target)
    try {
      const r = await fetch('/api/admin/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target }) })
      if (r.ok) { setDone(target); setTimeout(() => setDone(null), 2500); await load() }
    } catch { /* ignore */ }
    setBusy(null); setConfirm(null)
  }

  const cards: { key: keyof Counts; }[] = [{ key: 'whatsapp' }, { key: 'contact' }, { key: 'messages' }]

  return (
    <PageShell requires="manageData" breadcrumbs={[{ label: tNav('admin') }, { label: t('console') }]}>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('console')}</DisplayHeading>
        <p className="text-sm text-text-soft mt-2 leading-relaxed">{t('subline')}</p>
      </header>

      <NoteCallout className="mb-6" tone="warn" title={t('testingTitle')}>{t('testingBody')}</NoteCallout>

      {!configured && <Panel className="mb-6"><p className="py-6 text-center text-sm text-muted">{t('notConfigured')}</p></Panel>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {cards.map(({ key }) => {
          const Icon = ICONS[key]; const n = counts?.[key] ?? 0
          return (
            <Panel key={key}>
              <div className="flex items-start gap-3">
                <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-soft bg-accent-soft text-accent"><Icon className="h-4.5 w-4.5" strokeWidth={1.7} /></span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text leading-snug">{t(`t_${key}`)}</h3>
                  <p className="text-[11px] text-muted mt-0.5">{t(`d_${key}`)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div><div className="text-2xl font-display font-semibold tabular-nums text-text">{counts ? n : '—'}</div><div className="text-[11px] text-muted">{t('rows')}</div></div>
                {done === key ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft text-success px-3 py-1.5 text-xs font-medium"><Check className="h-3.5 w-3.5" strokeWidth={2} />{t('cleared')}</span>
                ) : confirm === key ? (
                  <div className="flex items-center gap-1.5">
                    <button type="button" disabled={busy === key} onClick={() => clear(key)} className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-3 py-1.5 text-xs font-medium hover:bg-accent-strong disabled:opacity-60 transition-colors">
                      {busy === key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />}{t('confirmClear')}
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="rounded-full border border-border px-3 py-1.5 text-xs text-text-soft hover:bg-surface-elev transition-colors">{t('cancel')}</button>
                  </div>
                ) : (
                  <button type="button" disabled={!n} onClick={() => setConfirm(key)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft disabled:opacity-40 disabled:hover:bg-transparent transition-colors">
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />{t('clear')}
                  </button>
                )}
              </div>
            </Panel>
          )
        })}
      </div>

      <button type="button" onClick={load} className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-xs text-text-soft hover:bg-surface-elev transition-colors">
        <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />{t('refresh')}
      </button>

      <div className="mt-8 flex items-start gap-2 text-xs text-muted max-w-2xl">
        <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-warn" strokeWidth={1.7} />
        <span>{t('footnote')}</span>
      </div>
    </PageShell>
  )
}
