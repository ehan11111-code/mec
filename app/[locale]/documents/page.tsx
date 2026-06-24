'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { FileCheck2, FileText, Check, X, RefreshCw, AlertTriangle, MessageCircle } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'

type DocType = 'invoice' | 'delivery_note' | 'payment'
type Row = { message_id: string; sender: string; phone: string; received_at: string; order_status: string; products: { name: string; qty?: number | null }[]; received: DocType[]; missing: DocType[]; complete: boolean }
const DOCS: ('po' | DocType)[] = ['po', 'invoice', 'delivery_note', 'payment']

export default function DocumentsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('documents'); const locale = useLocale() as 'en' | 'ar'
  const [rows, setRows] = useState<Row[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [view, setView] = useState<'all' | 'missing'>('missing')

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try { const d = await fetch('/api/documents').then(r => r.json()); if (Array.isArray(d)) setRows(d) } catch { setRows(r => r ?? []) }
    if (manual) setRefreshing(false)
  }, [])
  useEffect(() => { load(); const id = setInterval(() => load(), 20000); return () => clearInterval(id) }, [load])

  const list = rows ?? []
  const withMissing = useMemo(() => list.filter(r => r.missing.length > 0), [list])
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
                        <div className="text-text leading-snug flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 text-accent shrink-0" strokeWidth={1.7} />{r.sender}</div>
                        <div className="text-[11px] text-muted truncate max-w-[260px]">{items || r.phone} · {fmt(r.received_at)}</div>
                      </td>
                      {DOCS.map(d => (
                        <td key={d} className="px-3 py-3 text-center">
                          {has(r, d)
                            ? <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-success-soft text-success"><Check className="h-3.5 w-3.5" strokeWidth={2.4} /></span>
                            : <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-accent-soft text-accent"><X className="h-3.5 w-3.5" strokeWidth={2.4} /></span>}
                        </td>
                      ))}
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
    </PageShell>
  )
}
