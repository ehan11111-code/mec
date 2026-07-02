'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { ClipboardCheck, Check, X, Loader2, MessageCircle, RefreshCw, Trash2, FileText } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { useCurrentUser } from '@/lib/auth/useCurrentUser'
import { fmtDateTime, fmtDuration } from '@/lib/format/datetime'
import type { WhatsappMsg } from '@/lib/data/supply'

type Status = 'pending' | 'approved' | 'rejected'
// The approvals API enriches each order with when/how it was decided and how long that took.
type OrderRow = WhatsappMsg & { decidedAt?: string | null; minutesToDecision?: number | null; decisionVia?: 'reaction' | 'reply' | null; decisionKind?: string | null }
const st = (o: WhatsappMsg): Status => (o.order_status as Status) || 'pending'

export default function ApprovalsPage() {
  const t = useTranslations('approvals'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en' | 'ar'
  const { can } = useCurrentUser()
  const [orders, setOrders] = useState<OrderRow[] | null>(null)
  const [tab, setTab] = useState<Status>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try { const d = await fetch('/api/approvals').then(r => r.json()); if (Array.isArray(d)) setOrders(d) } catch { setOrders(o => o ?? []) }
    if (manual) setRefreshing(false)
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(() => load(), 20000) // auto-refresh so new orders appear
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [load])

  const list = orders ?? []
  const counts = useMemo(() => ({
    pending: list.filter(o => st(o) === 'pending').length,
    approved: list.filter(o => st(o) === 'approved').length,
    rejected: list.filter(o => st(o) === 'rejected').length
  }), [list])
  const shown = list.filter(o => st(o) === tab)

  async function decide(id: string, decision: Status) {
    setBusy(id)
    try {
      const r = await fetch('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: id, decision }) })
      if (r.ok) setOrders(os => (os || []).map(o => o.message_id === id ? { ...o, order_status: decision } : o))
    } catch { /* ignore */ }
    setBusy(null)
  }
  // jarvis/admin only: permanently delete an order. It vanishes from approvals, documents, the orders
  // feed, the inbox and notifications (all read the same live whatsapp_intake table).
  async function remove(id: string) {
    if (!window.confirm(t('confirmDelete'))) return
    setBusy(id)
    try {
      const r = await fetch('/api/approvals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: id }) })
      if (r.ok) setOrders(os => (os || []).filter(o => o.message_id !== id))
    } catch { /* ignore */ }
    setBusy(null)
  }
  const fmt = (s: string) => fmtDateTime(s, locale)
  const tabs: { id: Status; n: number }[] = [{ id: 'pending', n: counts.pending }, { id: 'approved', n: counts.approved }, { id: 'rejected', n: counts.rejected }]

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('approvals') }]}>
      <header className="mb-7 flex items-start justify-between gap-4">
        <div className="max-w-3xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
          <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
        </div>
        <button type="button" onClick={() => load(true)} disabled={refreshing} aria-label={t('refresh')}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={1.9} />
          <span className="hidden sm:inline">{t('refresh')}</span>
        </button>
      </header>

      <section className="mb-7 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kPending')} value={orders ? String(counts.pending) : '—'} index={0} accent />
        <StatCard label={t('kApproved')} value={orders ? String(counts.approved) : '—'} index={1} />
        <StatCard label={t('kRejected')} value={orders ? String(counts.rejected) : '—'} index={2} />
        <StatCard label={t('kTotal')} value={orders ? String(list.length) : '—'} index={3} />
      </section>

      <div className="mb-5 inline-flex rounded-full border border-border bg-surface p-1">
        {tabs.map(tb => (
          <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
            className={clsx('px-4 py-1.5 rounded-full text-xs font-medium transition-colors', tab === tb.id ? 'bg-accent text-white' : 'text-text-soft hover:text-text')}>
            {t(`tab_${tb.id}`)}{tb.n ? ` (${tb.n})` : ''}
          </button>
        ))}
      </div>

      {orders === null ? (
        <Panel><div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />…</div></Panel>
      ) : shown.length === 0 ? (
        <Panel><EmptyState icon={ClipboardCheck} title={t(`empty_${tab}`)} hint={tab === 'pending' ? t('emptyHint') : undefined} source={t('source')} /></Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {shown.map(o => (
            <Panel key={o.message_id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-accent shrink-0" strokeWidth={1.8} />
                    {o.order_no ? t('orderNo', { no: o.order_no }) : (o.client_name || o.push_name || o.phone)}
                  </h3>
                  {o.client_name && <p className="text-xs text-text-soft mt-0.5">{o.client_name}</p>}
                  <p className="text-[11px] text-muted mt-0.5 tabular-nums">{o.phone} · {fmt(o.received_at)}</p>
                  {(o.salesperson || o.push_name) && <p className="text-[11px] text-accent mt-1 font-medium">{t('broughtBy', { name: o.salesperson || o.push_name })}</p>}
                  {o.recipient && <p className="text-[11px] text-text-soft mt-0.5">{t('recipient', { name: o.recipient })}</p>}
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize',
                    st(o) === 'approved' ? 'bg-success-soft text-success' : st(o) === 'rejected' ? 'bg-bg-soft text-muted' : 'bg-warn-soft text-warn')}>{t(`tab_${st(o)}`)}</span>
                  <Link href={`/orders/${o.message_id}/document`} title={t('document')} aria-label={t('document')}
                    className="inline-flex items-center justify-center h-6 w-6 rounded-full text-muted hover:text-accent hover:bg-accent-soft transition-colors">
                    <FileText className="h-3.5 w-3.5" strokeWidth={1.9} />
                  </Link>
                  {can('manageData') && (
                    <button type="button" disabled={busy === o.message_id} onClick={() => remove(o.message_id)} title={t('delete')} aria-label={t('delete')}
                      className="inline-flex items-center justify-center h-6 w-6 rounded-full text-muted hover:text-accent hover:bg-accent-soft transition-colors disabled:opacity-50">
                      {busy === o.message_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />}
                    </button>
                  )}
                </div>
              </div>

              {o.products?.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {o.products.map((p, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-md bg-bg-soft px-2.5 py-1.5 text-xs">
                      <span className="text-text truncate">{p.name}</span>
                      <span className="shrink-0 text-text-soft tabular-nums">{p.qty ?? ''}{p.unit ? ` ${p.unit}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-xs text-muted italic">{t('noProducts')}</p>}

              <p className="mt-3 text-[11px] text-muted leading-snug border-s-2 border-border ps-2.5">{o.body}</p>

              {st(o) !== 'pending' && o.decidedAt && (
                <p className={clsx('mt-2 text-[11px] font-medium inline-flex items-center gap-1.5', st(o) === 'approved' ? 'text-success' : 'text-muted')}>
                  {st(o) === 'approved' ? <Check className="h-3 w-3" strokeWidth={2.4} /> : <X className="h-3 w-3" strokeWidth={2.4} />}
                  {t(`tab_${st(o)}`)} · {t('tookAfter', { dur: fmtDuration(o.minutesToDecision ?? null, locale) })}
                  {o.decisionVia ? ` · ${t(o.decisionVia === 'reaction' ? 'viaReaction' : 'viaReply')}` : ''} · {fmt(o.decidedAt)}
                </p>
              )}

              {st(o) === 'pending' && (
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <button type="button" disabled={busy === o.message_id} onClick={() => decide(o.message_id, 'approved')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-success text-white px-3.5 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
                    {busy === o.message_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.2} />}{t('approve')}
                  </button>
                  <button type="button" disabled={busy === o.message_id} onClick={() => decide(o.message_id, 'rejected')}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border text-text-soft px-3.5 py-1.5 text-xs font-medium hover:bg-surface-elev disabled:opacity-60 transition-colors">
                    <X className="h-3.5 w-3.5" strokeWidth={2.2} />{t('reject')}
                  </button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('note')}</p>
    </PageShell>
  )
}
