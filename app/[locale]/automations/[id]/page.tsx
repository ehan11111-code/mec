'use client'
import { use, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { notFound } from 'next/navigation'
import { clsx } from 'clsx'
import { ArrowLeft, Workflow, Clock, Zap, RefreshCw, MessageCircle, Mail, FileText, CheckCircle2, XCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { automations } from '@/lib/automations/registry'
import type { WhatsappMsg, EmailMsg } from '@/lib/data/supply'

type Filter = 'all' | 'order' | 'document' | 'decision' | 'noise'
const INTENT_TONE: Record<string, string> = { order: 'bg-success-soft text-success', inquiry: 'bg-warn-soft text-warn', complaint: 'bg-accent-soft text-accent', supplier: 'bg-warn-soft text-warn', payment: 'bg-success-soft text-success', approval: 'bg-success-soft text-success', other: 'bg-bg-soft text-muted' }

export default function AutomationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const tNav = useTranslations('nav'); const t = useTranslations('automations'); const locale = useLocale() as 'en' | 'ar'
  const a = automations.find(x => x.id === id)
  const source: 'whatsapp' | 'email' | null = id === 'whatsapp-intake' ? 'whatsapp' : id === 'email-intake' ? 'email' : null

  const [rows, setRows] = useState<any[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!source) return
    const url = source === 'whatsapp' ? '/api/whatsapp?all=1' : '/api/email'
    const load = () => fetch(url).then(r => r.json()).then(d => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([]))
    load(); const t = setInterval(load, 20000); return () => clearInterval(t)
  }, [source])

  const refresh = async () => { if (!source) return; setRefreshing(true); const url = source === 'whatsapp' ? '/api/whatsapp?all=1' : '/api/email'; try { const d = await fetch(url).then(r => r.json()); if (Array.isArray(d)) setRows(d) } catch {} setRefreshing(false) }

  const list = rows ?? []
  const bucket = (m: any): Filter => {
    if (m.decision) return 'decision'
    if (m.doc_type) return 'document'
    if (m.intent === 'order') return 'order'
    return 'noise'
  }
  const counts = useMemo(() => ({
    all: list.length,
    order: list.filter(m => bucket(m) === 'order').length,
    document: list.filter(m => bucket(m) === 'document').length,
    decision: list.filter(m => bucket(m) === 'decision').length,
    noise: list.filter(m => bucket(m) === 'noise').length
  }), [list])
  const shown = filter === 'all' ? list : list.filter(m => bucket(m) === filter)
  const fmt = (s: string) => { try { return new Date(s).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) } catch { return '—' } }

  if (!a) notFound()

  const filters: Filter[] = ['all', 'order', 'document', 'decision', 'noise']

  return (
    <PageShell requires="automations" breadcrumbs={[{ label: tNav('admin') }, { label: tNav('automations') }, { label: a.name[locale] }]}>
      <header className="mb-6">
        <Link href="/automations" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-4">
          <ArrowLeft className="h-3.5 w-3.5 flip-rtl" strokeWidth={1.7} />{t('back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 max-w-2xl">
            <span className="shrink-0 inline-flex items-center justify-center h-11 w-11 rounded-soft bg-accent-soft text-accent"><Workflow className="h-5 w-5" strokeWidth={1.7} /></span>
            <div>
              <Eyebrow accent>{t('phase')} {a.phase} · {t(a.kind)}</Eyebrow>
              <DisplayHeading size="md" className="mt-2" locale={locale}>{a.name[locale]}</DisplayHeading>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', a.status === 'live' ? 'bg-success-soft text-success' : 'bg-bg-soft text-muted')}>
                  <span className={clsx('h-1.5 w-1.5 rounded-full', a.status === 'live' ? 'bg-success' : 'bg-muted')} />{a.status === 'live' ? t('live') : t('planned')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-text-soft">
                  {a.triggerKind === 'schedule' ? <Clock className="h-3.5 w-3.5 text-muted" strokeWidth={1.8} /> : <Zap className="h-3.5 w-3.5 text-muted" strokeWidth={1.8} />}
                  {a.trigger[locale]}
                </span>
              </div>
            </div>
          </div>
          {source && (
            <button type="button" onClick={refresh} disabled={refreshing} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors disabled:opacity-60">
              <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={1.9} />{t('refreshLog')}
            </button>
          )}
        </div>
      </header>

      {/* how it works (docs) */}
      {a.notes && <NoteCallout className="mb-5" title={t('howItWorks')}>{a.notes[locale]}</NoteCallout>}

      <Panel className="mb-6" title={t('stepsTitle')}>
        <ol className="space-y-2">
          {a.steps.map((s, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm text-text-soft">
              <span className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent-soft text-accent text-[11px] font-semibold tabular-nums">{i + 1}</span>
              {s[locale]}
            </li>
          ))}
        </ol>
      </Panel>

      {/* activity log (live intake automations) */}
      {source ? (
        <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2">{source === 'whatsapp' ? <MessageCircle className="h-4 w-4 text-accent" strokeWidth={1.8} /> : <Mail className="h-4 w-4 text-accent" strokeWidth={1.8} />}{t('activityLog')}</span>} subtitle={t('activitySub')}>
        <div className="px-5 md:px-6 py-3 flex flex-wrap gap-2 border-b border-border">
          {filters.map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={clsx('rounded-full px-3 py-1 text-xs font-medium border transition-colors', filter === f ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>
              {t(`flt_${f}`)}{counts[f] ? ` (${counts[f]})` : ''}
            </button>
          ))}
        </div>
        {rows === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><RefreshCw className="h-4 w-4 animate-spin" />…</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={source === 'whatsapp' ? MessageCircle : Mail} title={t('logEmpty')} hint={t('logEmptyHint')} source={source === 'whatsapp' ? 'Supabase · whatsapp_intake' : 'Supabase · email_intake'} />
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((m: any) => source === 'whatsapp' ? <WaRow key={m.message_id} m={m as WhatsappMsg} t={t} fmt={fmt} /> : <EmailRow key={m.message_id} m={m as EmailMsg} t={t} fmt={fmt} />)}
          </ul>
        )}
        </Panel>
      ) : (
        <NoteCallout tone="info" title={t('noLogTitle')}>{t('noLogBody')}</NoteCallout>
      )}
    </PageShell>
  )
}

function Chip({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'accent' | 'success' | 'warn' }) {
  const tones = { muted: 'bg-bg-soft text-muted', accent: 'bg-accent-soft text-accent', success: 'bg-success-soft text-success', warn: 'bg-warn-soft text-warn' }
  return <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', tones[tone])}>{children}</span>
}

function WaRow({ m, t, fmt }: { m: WhatsappMsg; t: any; fmt: (s: string) => string }) {
  return (
    <li className="px-5 md:px-6 py-3.5 hover:bg-surface-elev transition-colors">
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-8 w-8 rounded-full bg-accent-soft text-accent text-xs font-semibold">{(m.salesperson || m.push_name || m.phone || '?').slice(0, 2).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text truncate">{m.salesperson || m.push_name || m.phone}</span>
            {m.group_type && <Chip>{m.group_type}</Chip>}
            <Chip tone={m.intent === 'order' ? 'success' : 'muted'}>{m.intent}</Chip>
            {m.doc_type && <Chip tone="warn">{m.doc_type}</Chip>}
            {m.order_status && <Chip tone={m.order_status === 'approved' ? 'success' : m.order_status === 'rejected' ? 'accent' : 'warn'}>{m.order_status}</Chip>}
            {m.decision && <Chip tone="accent">↩ {m.decision}</Chip>}
            {m.archived && <Chip>{t('archivedTest')}</Chip>}
          </div>
          {(m.order_no || m.client_name || m.recipient) && (
            <div className="mt-1 text-[11px] text-text-soft flex flex-wrap gap-x-3">
              {m.order_no && <span>#{m.order_no}</span>}
              {m.client_name && <span>{m.client_name}</span>}
              {m.recipient && <span>{t('recipientShort')}: {m.recipient}</span>}
            </div>
          )}
          <p className="mt-1 text-sm text-text-soft leading-snug break-words">{m.body || <span className="text-muted italic">{m.message_type}</span>}</p>
          {m.products?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {m.products.map((p, i) => <span key={i} className="inline-flex items-center rounded-md bg-bg-soft px-2 py-0.5 text-[11px] text-text-soft">{p.name}{p.qty ? ` · ${p.qty}${p.unit ? ' ' + p.unit : ''}` : ''}</span>)}
            </div>
          )}
          {m.raw != null && (
            <details className="mt-2">
              <summary className="cursor-pointer list-none text-[11px] text-muted hover:text-accent">{t('rawToggle')}</summary>
              <pre className="mt-1.5 max-h-64 overflow-auto rounded-soft bg-bg-soft p-2.5 text-[10px] leading-relaxed text-text-soft whitespace-pre-wrap break-all">{JSON.stringify(m.raw, null, 1)}</pre>
            </details>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-muted tabular-nums">{fmt(m.received_at)}</span>
      </div>
    </li>
  )
}

function EmailRow({ m, t, fmt }: { m: EmailMsg; t: any; fmt: (s: string) => string }) {
  return (
    <li className="px-5 md:px-6 py-3.5 hover:bg-surface-elev transition-colors">
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-8 w-8 rounded-full bg-accent-soft text-accent"><Mail className="h-4 w-4" strokeWidth={1.8} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-text truncate">{m.from_name || m.from_email}</span>
            <span className="text-[11px] text-muted truncate">{m.from_email}</span>
            <Chip tone={m.intent === 'order' ? 'success' : 'muted'}>{m.intent}</Chip>
            {m.doc_type && <Chip tone="warn">{m.doc_type}</Chip>}
            {m.has_attachment && <Chip tone="accent"><FileText className="h-2.5 w-2.5 me-0.5" strokeWidth={2} />{(m.attachments || []).length || 1}</Chip>}
          </div>
          <p className="mt-1 text-sm font-medium text-text break-words">{m.subject || <span className="text-muted italic">(no subject)</span>}</p>
          <p className="mt-0.5 text-xs text-text-soft leading-snug break-words line-clamp-3">{m.summary || m.body}</p>
          {m.products?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {m.products.map((p, i) => <span key={i} className="inline-flex items-center rounded-md bg-bg-soft px-2 py-0.5 text-[11px] text-text-soft">{p.name}{p.qty ? ` · ${p.qty}` : ''}</span>)}
            </div>
          )}
        </div>
        <span className="shrink-0 text-[11px] text-muted tabular-nums">{fmt(m.received_at)}</span>
      </div>
    </li>
  )
}
