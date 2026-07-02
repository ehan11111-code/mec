'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { FileCheck2, FileText, Check, X, RefreshCw, AlertTriangle, MessageCircle, FileType2, ExternalLink } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { fmtDuration } from '@/lib/format/datetime'

type DocType = 'invoice' | 'delivery_note' | 'payment'
type Prod = { name: string; qty?: number | null; unit?: string | null }
type DocMessage = { message_id: string; doc_type: string; filename: string; body: string; media_url: string; message_type: string; sender: string; received_at: string; minutesAfterOrder: number | null; client: string | null; products: Prod[]; link: 'order_no' | 'client_product' | 'time_only' | 'conflict'; mismatch: boolean }
type Row = { message_id: string; orderNo: string | null; client: string | null; sender: string; phone: string; recipient: string | null; units: number; received_at: string; body: string; order_status: string; products: Prod[]; received: DocType[]; missing: DocType[]; complete: boolean; mismatchCount: number; docMsgs: DocMessage[] }
const DOCS: ('po' | DocType)[] = ['po', 'invoice', 'delivery_note', 'payment']
type Opened = { kind: 'po'; row: Row } | { kind: DocType; row: Row; doc: DocMessage }

export default function DocumentsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('documents'); const locale = useLocale() as 'en' | 'ar'
  const [rows, setRows] = useState<Row[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState<'all' | 'missing'>('missing')
  const [opened, setOpened] = useState<Opened | null>(null)
  const openDoc = (row: Row, d: 'po' | DocType) => {
    if (d === 'po') { setOpened({ kind: 'po', row }); return }
    const doc = row.docMsgs.find(m => m.doc_type === d)
    if (doc) setOpened({ kind: d, row, doc })
  }

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try { const d = await fetch('/api/documents').then(r => r.json()); if (Array.isArray(d)) setRows(d) } catch { setRows(r => r ?? []) }
    if (manual) setRefreshing(false)
  }, [])
  useEffect(() => { load(); const id = setInterval(() => load(), 20000); return () => clearInterval(id) }, [load])

  const list = rows ?? []
  const withMissing = useMemo(() => list.filter(r => r.missing.length > 0), [list])
  const mismatchTotal = useMemo(() => list.reduce((s, r) => s + (r.mismatchCount || 0), 0), [list])
  const shown = view === 'missing' ? withMissing : list
  const fmt = (s: string) => { try { return new Date(s).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) } catch { return '—' } }
  const has = (r: Row, d: 'po' | DocType) => d === 'po' ? true : r.received.includes(d)

  return (
    <PageShell requires="documents" breadcrumbs={[{ label: tNav('operations') }, { label: tNav('documents') }]}>
      <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
          <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
        </div>
        <button type="button" onClick={() => load(true)} disabled={refreshing} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={1.9} />{t('refresh')}
        </button>
      </header>

      <section className="mb-6 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('kOrders')} value={rows ? String(list.length) : '—'} index={0} accent />
        <StatCard label={t('kMissing')} value={rows ? String(withMissing.length) : '—'} index={1} />
        <StatCard label={t('kComplete')} value={rows ? String(list.filter(r => r.complete).length) : '—'} index={2} />
        <StatCard label={t('kInvoiceMissing')} value={rows ? String(list.filter(r => r.missing.includes('invoice')).length) : '—'} index={3} />
      </section>

      <NoteCallout className="mb-6" title={t('noteTitle')}>{t('note')}</NoteCallout>
      {mismatchTotal > 0 && <NoteCallout className="mb-6" tone="warn" title={t('mismatchTitle')}>{t('mismatchBody', { n: mismatchTotal })}</NoteCallout>}

      <Panel bodyClassName="px-0 pb-0" title={t('checklist')}>
        <div className="px-5 md:px-6 py-3 flex flex-wrap gap-2 border-b border-border">
          {(['missing', 'all'] as const).map(v => (
            <button key={v} type="button" onClick={() => setView(v)}
              className={clsx('rounded-full px-3 py-1 text-xs font-medium border transition-colors', view === v ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>
              {t(`view_${v}`)}{v === 'missing' && withMissing.length ? ` (${withMissing.length})` : ''}
            </button>
          ))}
        </div>

        {rows === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><RefreshCw className="h-4 w-4 animate-spin" />…</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={FileCheck2} title={view === 'missing' ? t('noMissing') : t('empty')} hint={list.length === 0 ? t('emptyHint') : undefined} source={t('source')} />
        ) : (
          <div className="overflow-x-auto scrollbar-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="text-start font-medium px-5 md:px-6 py-3">{t('colOrder')}</th>
                  {DOCS.map(d => <th key={d} className="text-center font-medium px-3 py-3">{t(`doc_${d}`)}</th>)}
                  <th className="text-end font-medium px-5 md:px-6 py-3">{t('colStatus')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map(r => {
                  const items = (r.products || []).map(p => `${p.name}${p.qty ? ` ×${p.qty}` : ''}`).join(', ')
                  return (
                    <tr key={r.message_id} className="hover:bg-surface-elev transition-colors">
                      <td className="px-5 md:px-6 py-3">
                        <div className="text-text leading-snug flex items-center gap-1.5">
                          <MessageCircle className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={1.7} />
                          <span className="font-medium">{r.orderNo ? t('orderNo', { no: r.orderNo }) : (r.client || r.sender)}</span>
                        </div>
                        <div className="text-[11px] text-muted truncate max-w-[280px]">
                          {r.client ? `${r.client} · ` : ''}{items || r.phone}
                        </div>
                        <div className="text-[11px] text-muted mt-0.5 flex flex-wrap gap-x-3">
                          <span>{t('bySalesperson', { name: r.sender })}</span>
                          {r.units > 0 && <span>{t('unitsLabel', { n: r.units })}</span>}
                          {r.recipient && <span>{t('recipientLabel', { name: r.recipient })}</span>}
                          <span>{fmt(r.received_at)}</span>
                        </div>
                      </td>
                      {DOCS.map(d => {
                        const mm = d !== 'po' ? r.docMsgs.find(m => m.doc_type === d && m.mismatch) : undefined
                        return (
                          <td key={d} className="px-3 py-3 text-center">
                            {has(r, d)
                              ? <button type="button" onClick={() => openDoc(r, d)} title={t('viewDoc')}
                                  className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-success-soft text-success hover:ring-2 hover:ring-success/40 transition-shadow cursor-pointer"><Check className="h-3.5 w-3.5" strokeWidth={2.4} /></button>
                              : mm
                                ? <button type="button" onClick={() => openDoc(r, d)} title={t('mismatchBadge')}
                                    className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-warn-soft text-warn hover:ring-2 hover:ring-warn/40 transition-shadow cursor-pointer"><AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.2} /></button>
                                : <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-accent-soft text-accent"><X className="h-3.5 w-3.5" strokeWidth={2.4} /></span>}
                          </td>
                        )
                      })}
                      <td className="px-5 md:px-6 py-3 text-end">
                        {r.complete
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-success-soft text-success px-2.5 py-0.5 text-[11px] font-medium"><FileCheck2 className="h-3 w-3" strokeWidth={2} />{t('complete')}</span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft text-accent px-2.5 py-0.5 text-[11px] font-medium"><AlertTriangle className="h-3 w-3" strokeWidth={2} />{t('nMissing', { n: r.missing.length })}</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {opened && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpened(null)} />
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-auto scrollbar-soft rounded-2xl border border-border bg-surface shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
              <h3 className="text-sm font-semibold text-text inline-flex items-center gap-2">
                {opened.kind === 'po' ? <MessageCircle className="h-4 w-4 text-accent" strokeWidth={1.8} /> : <FileType2 className="h-4 w-4 text-accent" strokeWidth={1.8} />}
                {opened.kind === 'po' ? t('doc_po') : t(`doc_${opened.kind}`)}
              </h3>
              <button type="button" onClick={() => setOpened(null)} className="text-muted hover:text-text transition-colors"><X className="h-4 w-4" strokeWidth={2} /></button>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              {opened.kind === 'po' ? (
                <>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-soft">
                    {opened.row.orderNo && <span className="text-text font-medium">{t('orderNo', { no: opened.row.orderNo })}</span>}
                    {opened.row.client && <span>{opened.row.client}</span>}
                    <span>{t('bySalesperson', { name: opened.row.sender })}</span>
                    {opened.row.recipient && <span>{t('recipientLabel', { name: opened.row.recipient })}</span>}
                    <span>{fmt(opened.row.received_at)}</span>
                  </div>
                  {opened.row.products.length > 0 && (
                    <ul className="rounded-soft border border-border divide-y divide-border">
                      {opened.row.products.map((p, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                          <span className="text-text">{p.name}</span>
                          <span className="text-text-soft tabular-nums">{p.qty ?? ''}{p.unit ? ` ${p.unit}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {opened.row.body && <p className="text-xs text-text-soft leading-relaxed border-s-2 border-border ps-2.5 whitespace-pre-wrap">{opened.row.body}</p>}
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3 rounded-soft bg-bg-soft px-3 py-3">
                    <FileText className="h-8 w-8 text-accent shrink-0" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className="text-text font-medium break-words">{opened.doc.filename || t(`doc_${opened.kind}`)}</p>
                      <p className="text-[11px] text-muted mt-0.5">{t('docFrom', { name: opened.doc.sender })} · {fmt(opened.doc.received_at)}</p>
                      {opened.doc.minutesAfterOrder != null && <p className="text-[11px] text-accent mt-0.5 font-medium">{t('docAfterOrder', { dur: fmtDuration(opened.doc.minutesAfterOrder, locale) })}</p>}
                    </div>
                  </div>
                  {opened.doc.mismatch && (
                    <div className="flex items-start gap-2 rounded-soft bg-warn-soft text-warn px-3 py-2 text-[11px] leading-snug">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" strokeWidth={2} />
                      <span>{t('mismatchHint')}</span>
                    </div>
                  )}
                  {/* The document's OWN client + items — compared with the order's, so a wrong match is visible. */}
                  <div className="rounded-soft border border-border px-3 py-2 text-[11px] space-y-1">
                    <p className="text-muted">{t('docClientLabel')}: <span className="text-text font-medium" dir="auto">{opened.doc.client || '—'}</span></p>
                    <p className="text-muted">{t('orderClientLabel')}: <span className="text-text" dir="auto">{opened.row.client || opened.row.sender}</span></p>
                  </div>
                  {opened.doc.products.length > 0 && (
                    <ul className="rounded-soft border border-border divide-y divide-border">
                      {opened.doc.products.map((p, i) => (
                        <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                          <span className="text-text" dir="auto">{p.name}</span>
                          <span className="text-text-soft tabular-nums">{p.qty ?? ''}{p.unit ? ` ${p.unit}` : ''}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {opened.doc.media_url
                    ? <a href={`/api/wa-file?id=${encodeURIComponent(opened.doc.message_id)}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity">
                        <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />{t('openFile')}
                      </a>
                    : <p className="text-xs text-muted">{t('noFile')}</p>}
                  <p className="text-[11px] text-muted leading-relaxed">{t('fileNote')}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
