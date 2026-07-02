'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Truck, Check, Loader2, RefreshCw, FileText, MapPin, User, IdCard } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { EmptyState } from '@/components/EmptyState'
import { Link } from '@/i18n/navigation'
import { fmtDateTime } from '@/lib/format/datetime'

type Dispatch = { driver?: string; driverId?: string; plate?: string; address?: string; status?: string; at?: string }
type Order = { message_id: string; order_no?: string | null; client_name?: string | null; salesperson?: string | null; push_name?: string | null; phone?: string; received_at: string; products?: { name: string; qty?: number | null; unit?: string | null }[]; raw?: { dispatch?: Dispatch } }
type DStatus = 'ready' | 'dispatched' | 'delivered'
const dstatus = (o: Order): DStatus => (o.raw?.dispatch?.status as DStatus) || 'ready'

export default function DispatchPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('dispatch'); const locale = useLocale() as 'en' | 'ar'
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [tab, setTab] = useState<DStatus>('ready')
  const [edits, setEdits] = useState<Record<string, Dispatch>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try {
      const d = await fetch('/api/approvals', { cache: 'no-store' }).then(r => r.json())
      if (Array.isArray(d)) setOrders(d.filter((o: any) => o.order_status === 'approved'))
    } catch { setOrders(o => o ?? []) }
    if (manual) setRefreshing(false)
  }, [])
  useEffect(() => { load(); const id = setInterval(() => load(), 20000); return () => clearInterval(id) }, [load])

  const list = orders ?? []
  const counts = useMemo(() => ({
    ready: list.filter(o => dstatus(o) === 'ready').length,
    dispatched: list.filter(o => dstatus(o) === 'dispatched').length,
    delivered: list.filter(o => dstatus(o) === 'delivered').length
  }), [list])
  const shown = list.filter(o => dstatus(o) === tab)
  const field = (o: Order, k: keyof Dispatch) => edits[o.message_id]?.[k] ?? o.raw?.dispatch?.[k] ?? ''
  const setField = (id: string, k: keyof Dispatch, v: string) => setEdits(e => ({ ...e, [id]: { ...e[id], [k]: v } }))

  async function save(o: Order, status: DStatus) {
    setBusy(o.message_id)
    try {
      const body = { message_id: o.message_id, status, driver: field(o, 'driver'), driverId: field(o, 'driverId'), plate: field(o, 'plate'), address: field(o, 'address') }
      const r = await fetch('/api/orders/dispatch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (r.ok) { const d = await r.json(); setOrders(os => (os || []).map(x => x.message_id === o.message_id ? { ...x, raw: { ...x.raw, dispatch: d.dispatch } } : x)); setEdits(e => { const n = { ...e }; delete n[o.message_id]; return n }) }
    } catch { /* ignore */ }
    setBusy(null)
  }

  const tabs: { id: DStatus; n: number }[] = [{ id: 'ready', n: counts.ready }, { id: 'dispatched', n: counts.dispatched }, { id: 'delivered', n: counts.delivered }]

  return (
    <PageShell requires="logistics" breadcrumbs={[{ label: tNav('secWarehouse') }, { label: tNav('dispatch') }]}>
      <header className="mb-7 flex items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
          <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
        </div>
        <button type="button" onClick={() => load(true)} disabled={refreshing} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={1.9} /><span className="hidden sm:inline">{t('refresh')}</span>
        </button>
      </header>

      <section className="mb-7 grid gap-3 md:gap-4 grid-cols-3">
        <StatCard label={t('kReady')} value={orders ? String(counts.ready) : '—'} index={0} accent />
        <StatCard label={t('kDispatched')} value={orders ? String(counts.dispatched) : '—'} index={1} />
        <StatCard label={t('kDelivered')} value={orders ? String(counts.delivered) : '—'} index={2} />
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
        <Panel><div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div></Panel>
      ) : shown.length === 0 ? (
        <Panel><EmptyState icon={Truck} title={t(`empty_${tab}`)} source={t('source')} /></Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {shown.map(o => {
            const st = dstatus(o)
            const items = (o.products || []).map(p => `${p.name}${p.qty ? ` ×${p.qty}` : ''}`).join('، ')
            return (
              <Panel key={o.message_id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-text truncate" dir="auto">{o.client_name || o.salesperson || o.phone}</h3>
                    <p className="text-[11px] text-muted mt-0.5 truncate max-w-[320px]" dir="auto">{items}</p>
                    <p className="text-[11px] text-muted mt-0.5">{t('by', { name: o.salesperson || o.push_name || '—' })} · {fmtDateTime(o.received_at, locale)}</p>
                  </div>
                  <Link href={`/orders/${o.message_id}/document`} title={t('deliveryNote')} className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text-soft hover:bg-surface-elev transition-colors">
                    <FileText className="h-3 w-3" strokeWidth={1.9} />{t('note')}
                  </Link>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  <label className="text-[11px] text-muted"><span className="inline-flex items-center gap-1"><User className="h-3 w-3" strokeWidth={1.8} />{t('driver')}</span>
                    <input value={field(o, 'driver')} onChange={e => setField(o.message_id, 'driver', e.target.value)} className="mt-1 w-full rounded-soft border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:border-accent transition-colors" /></label>
                  <label className="text-[11px] text-muted"><span className="inline-flex items-center gap-1"><IdCard className="h-3 w-3" strokeWidth={1.8} />{t('driverId')}</span>
                    <input value={field(o, 'driverId')} onChange={e => setField(o.message_id, 'driverId', e.target.value)} className="mt-1 w-full rounded-soft border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:border-accent transition-colors" /></label>
                  <label className="text-[11px] text-muted"><span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" strokeWidth={1.8} />{t('plate')}</span>
                    <input value={field(o, 'plate')} onChange={e => setField(o.message_id, 'plate', e.target.value)} className="mt-1 w-full rounded-soft border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:border-accent transition-colors" /></label>
                  <label className="text-[11px] text-muted"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" strokeWidth={1.8} />{t('address')}</span>
                    <input value={field(o, 'address')} onChange={e => setField(o.message_id, 'address', e.target.value)} className="mt-1 w-full rounded-soft border border-border bg-surface px-2.5 py-1.5 text-sm text-text focus:border-accent transition-colors" /></label>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium', st === 'delivered' ? 'bg-success-soft text-success' : st === 'dispatched' ? 'bg-accent-soft text-accent' : 'bg-warn-soft text-warn')}>{t(`tab_${st}`)}</span>
                  <button type="button" disabled={busy === o.message_id} onClick={() => save(o, st)} className="inline-flex items-center gap-1.5 rounded-full border border-border text-text-soft px-3 py-1.5 text-xs font-medium hover:bg-surface-elev disabled:opacity-60 transition-colors">
                    {busy === o.message_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{t('saveDetails')}
                  </button>
                  {st === 'ready' && <button type="button" disabled={busy === o.message_id} onClick={() => save(o, 'dispatched')} className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-3.5 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"><Truck className="h-3.5 w-3.5" strokeWidth={2} />{t('markDispatched')}</button>}
                  {st === 'dispatched' && <button type="button" disabled={busy === o.message_id} onClick={() => save(o, 'delivered')} className="inline-flex items-center gap-1.5 rounded-full bg-success text-white px-3.5 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"><Check className="h-3.5 w-3.5" strokeWidth={2.2} />{t('markDelivered')}</button>}
                </div>
              </Panel>
            )
          })}
        </div>
      )}
      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('footnote')}</p>
    </PageShell>
  )
}
