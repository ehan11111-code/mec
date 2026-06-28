'use client'
import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { MessageCircle, RefreshCw, Trash2, Loader2, FileText, Paperclip } from 'lucide-react'
import { Panel } from './Panel'
import { EmptyState } from './EmptyState'
import { useCurrentUser } from '@/lib/auth/useCurrentUser'
import { fmtDateTime } from '@/lib/format/datetime'

// One reusable live feed of the latest real orders (WhatsApp intake), newest first, each with the
// PROOF documents that arrived for it (invoice / delivery note / payment — opens the actual file) and,
// for jarvis/admin, a delete button. Reads /api/documents, the single live source shared with the
// Documents and Approvals pages — so deleting here updates everywhere. Drop it on any page that should
// show "the latest orders + their proofs" (Orders, Operations, …).

type DocType = 'invoice' | 'delivery_note' | 'payment'
type DocMessage = { message_id: string; doc_type: string; filename: string; received_at: string; sender: string }
type Row = {
  message_id: string; orderNo: string | null; client: string | null; sender: string; phone: string
  units: number; received_at: string; order_status: string
  products: { name: string; qty?: number | null; unit?: string | null }[]
  received: DocType[]; missing: DocType[]; complete: boolean; docMsgs: DocMessage[]
}
const DOC_ICON_ORDER: DocType[] = ['invoice', 'delivery_note', 'payment']

// A minimal view of the live rows reported up to a parent, enough to drive KPI tiles (counts/status).
export type LiveOrderRow = { message_id: string; order_status: string; received_at: string }

export function LatestOrders({ limit = 6, className, onData }: { limit?: number; className?: string; onData?: (rows: LiveOrderRow[]) => void }) {
  const t = useTranslations('latest'); const locale = useLocale() as 'en' | 'ar'
  const { can } = useCurrentUser()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  // Report the live list up so a parent's headline counts (Orders / Operations tiles) stay in sync —
  // including right after a delete, which is what makes the whole order surface feel connected.
  useEffect(() => { if (rows && onData) onData(rows) }, [rows, onData])

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try { const d = await fetch('/api/documents').then(r => r.json()); if (Array.isArray(d)) setRows(d) } catch { setRows(r => r ?? []) }
    if (manual) setRefreshing(false)
  }, [])
  useEffect(() => {
    load()
    const id = setInterval(() => load(), 20000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [load])

  async function remove(id: string) {
    if (!window.confirm(t('confirmDelete'))) return
    setBusy(id)
    try {
      const r = await fetch('/api/approvals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: id }) })
      if (r.ok) setRows(rs => (rs || []).filter(x => x.message_id !== id))
    } catch { /* ignore */ }
    setBusy(null)
  }

  const list = (rows ?? []).slice(0, limit)
  const statusTone = (s: string) => s === 'approved' ? 'bg-success-soft text-success' : s === 'rejected' ? 'bg-bg-soft text-muted' : 'bg-warn-soft text-warn'

  return (
    <Panel className={className} bodyClassName="px-0 pb-0" title={t('title')} subtitle={t('subtitle')}
      action={
        <button type="button" onClick={() => load(true)} disabled={refreshing} aria-label={t('refresh')}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3 py-1.5 text-xs font-medium text-text-soft transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={1.9} />
          <span className="hidden sm:inline">{t('refresh')}</span>
        </button>
      }>
      {rows === null ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
      ) : list.length === 0 ? (
        <EmptyState icon={MessageCircle} title={t('empty')} hint={t('emptyHint')} source={t('source')} />
      ) : (
        <ul className="divide-y divide-border">
          {list.map(o => {
            const items = (o.products || []).map(p => `${p.name}${p.qty ? ` ×${p.qty}` : ''}`).join('، ')
            return (
              <li key={o.message_id} className="px-5 md:px-6 py-3.5 hover:bg-surface-elev transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={1.7} />
                      <span className="truncate">{o.orderNo ? t('orderNo', { no: o.orderNo }) : (o.client || o.sender)}</span>
                    </div>
                    {items && <div className="text-[11px] text-text-soft mt-0.5 truncate max-w-[420px]">{items}</div>}
                    <div className="text-[11px] text-muted mt-0.5 flex flex-wrap gap-x-3 tabular-nums">
                      <span>{fmtDateTime(o.received_at, locale)}</span>
                      <span>{t('by', { name: o.sender })}</span>
                      {o.units > 0 && <span>{t('units', { n: o.units })}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium', statusTone(o.order_status))}>{t(`st_${o.order_status}`)}</span>
                    {can('manageData') && (
                      <button type="button" disabled={busy === o.message_id} onClick={() => remove(o.message_id)} title={t('delete')} aria-label={t('delete')}
                        className="inline-flex items-center justify-center h-6 w-6 rounded-full text-muted hover:text-accent hover:bg-accent-soft transition-colors disabled:opacity-50">
                        {busy === o.message_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />}
                      </button>
                    )}
                  </div>
                </div>
                {/* proofs: documents that arrived for this order */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted"><Paperclip className="h-3 w-3" strokeWidth={1.8} />{t('proofs')}</span>
                  {DOC_ICON_ORDER.map(d => {
                    const doc = o.docMsgs.find(m => m.doc_type === d)
                    return doc ? (
                      <a key={d} href={`/api/wa-file?id=${encodeURIComponent(doc.message_id)}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-success-soft text-success px-2 py-0.5 text-[10px] font-medium hover:ring-2 hover:ring-success/40 transition-shadow">
                        <FileText className="h-3 w-3" strokeWidth={1.9} />{t(`doc_${d}`)}
                      </a>
                    ) : (
                      <span key={d} className="inline-flex items-center gap-1 rounded-full bg-bg-soft text-muted px-2 py-0.5 text-[10px]">{t(`doc_${d}`)} ✕</span>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
