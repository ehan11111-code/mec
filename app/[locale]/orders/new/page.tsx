'use client'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { ShoppingBag, Plus, Trash2, Check, AlertTriangle, Ban, HelpCircle, Loader2, X } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { Link } from '@/i18n/navigation'
import { getClients, getProductList, fmtSAR } from '@/lib/data/dataset'
import { evaluateOrder, type LineInput, type Verdict } from '@/lib/o2c/margin'

type Line = { item: string; sell: string; qty: string }
const V_TONE: Record<Verdict, string> = {
  auto: 'bg-success-soft text-success', warn: 'bg-warn-soft text-warn', block: 'bg-accent-soft text-accent', review: 'bg-bg-soft text-muted'
}
const V_ICON: Record<Verdict, typeof Check> = { auto: Check, warn: AlertTriangle, block: Ban, review: HelpCircle }

export default function NewOrderPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('newOrder'); const locale = useLocale() as 'en' | 'ar'
  const clients = useMemo(() => getClients(), [])
  const products = useMemo(() => getProductList().slice().sort((a, b) => a.item.localeCompare(b.item)), [])
  const prodByItem = useMemo(() => new Map(products.map(p => [p.item, p])), [products])

  const [clientName, setClientName] = useState('')
  const [lines, setLines] = useState<Line[]>([{ item: '', sell: '', qty: '' }])
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [result, setResult] = useState<{ autoApproved: boolean; orderId: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Live margin-gate evaluation — the same engine the server uses, so the preview and the decision agree.
  const inputs: LineInput[] = useMemo(() => lines.filter(l => l.item && Number(l.sell) > 0 && Number(l.qty) > 0).map(l => {
    const p = prodByItem.get(l.item)
    return { item: l.item, category: p?.category || 'Beef', sell: Number(l.sell), qty: Number(l.qty), cost: p?.unitCost ?? null, onHand: p?.onHand ?? null, confidence: p?.confidence ?? 'none' }
  }), [lines, prodByItem])
  const evaluation = useMemo(() => evaluateOrder(inputs), [inputs])
  const evalByItem = useMemo(() => new Map(evaluation.lines.map(e => [e.item, e])), [evaluation])
  // A no-cost (review) or below-floor (block) line still submits — it just routes to a human. Only an
  // empty client / no items disables submit.
  const ready = !!clientName && inputs.length > 0

  const setLine = (i: number, patch: Partial<Line>) => setLines(ls => ls.map((l, j) => j === i ? { ...l, ...patch } : l))
  const addLine = () => setLines(ls => [...ls, { item: '', sell: '', qty: '' }])
  const removeLine = (i: number) => setLines(ls => ls.length > 1 ? ls.filter((_, j) => j !== i) : ls)
  const onPickProduct = (i: number, item: string) => {
    const p = prodByItem.get(item)
    setLine(i, { item, sell: p && p.avgSell ? String(Math.round(p.avgSell)) : '' })
  }

  async function submit(confirmBelowTarget = false) {
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/orders/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, lines: inputs.map(l => ({ item: l.item, sell: l.sell, qty: l.qty })), confirmBelowTarget })
      })
      if (r.status === 409) { setConfirmOpen(true); setBusy(false); return }
      const d = await r.json()
      if (r.ok && d.ok) { setResult({ autoApproved: d.autoApproved, orderId: d.orderId }); setConfirmOpen(false) }
      else setError(d.detail || d.error || 'error')
    } catch { setError('network') }
    setBusy(false)
  }

  const reset = () => { setResult(null); setClientName(''); setLines([{ item: '', sell: '', qty: '' }]) }

  return (
    <PageShell requires="orders" breadcrumbs={[{ label: tNav('secSales') }, { label: tNav('newOrder') }]}>
      <header className="mb-7 max-w-2xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      {result ? (
        <Panel>
          <div className="flex flex-col items-center text-center py-8 gap-4">
            <span className={clsx('inline-flex h-14 w-14 items-center justify-center rounded-full', result.autoApproved ? 'bg-success-soft text-success' : 'bg-warn-soft text-warn')}>
              {result.autoApproved ? <Check className="h-7 w-7" strokeWidth={2.2} /> : <AlertTriangle className="h-7 w-7" strokeWidth={2} />}
            </span>
            <div>
              <h3 className="text-lg font-semibold text-text">{result.autoApproved ? t('doneAuto') : t('doneQueued')}</h3>
              <p className="text-sm text-text-soft mt-1 max-w-md">{result.autoApproved ? t('doneAutoSub') : t('doneQueuedSub')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/approvals" className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity">{t('viewApprovals')}</Link>
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-text-soft hover:bg-surface-elev transition-colors">{t('another')}</button>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Panel title={t('client')}>
              <select value={clientName} onChange={e => setClientName(e.target.value)}
                className="w-full rounded-soft border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent transition-colors">
                <option value="">{t('pickClient')}</option>
                {clients.map(c => { const n = c.nameAr || c.nameEn; return <option key={c.id} value={n}>{locale === 'ar' ? (c.nameAr || c.nameEn) : (c.nameEn || c.nameAr)}</option> })}
              </select>
            </Panel>

            <Panel title={t('items')} bodyClassName="px-0 pb-0"
              action={<button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-soft hover:bg-surface-elev transition-colors"><Plus className="h-3.5 w-3.5" strokeWidth={2} />{t('addItem')}</button>}>
              <div className="divide-y divide-border">
                {lines.map((l, i) => {
                  const p = prodByItem.get(l.item)
                  const e = evalByItem.get(l.item)
                  const Icon = e ? V_ICON[e.verdict] : HelpCircle
                  return (
                    <div key={i} className="px-5 md:px-6 py-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <select value={l.item} onChange={ev => onPickProduct(i, ev.target.value)}
                          className="flex-1 rounded-soft border border-border bg-surface px-3 py-2 text-sm text-text focus:border-accent transition-colors" dir="auto">
                          <option value="">{t('pickItem')}</option>
                          {products.map(pr => <option key={pr.item} value={pr.item}>{pr.item}</option>)}
                        </select>
                        {lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="mt-1.5 text-muted hover:text-accent transition-colors" aria-label={t('remove')}><Trash2 className="h-4 w-4" strokeWidth={1.8} /></button>}
                      </div>
                      {l.item && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="text-[11px] text-muted">{t('sell')}
                              <input type="number" min={0} value={l.sell} onChange={ev => setLine(i, { sell: ev.target.value })} placeholder={p?.avgSell ? String(Math.round(p.avgSell)) : '0'}
                                className="mt-1 w-full rounded-soft border border-border bg-surface px-3 py-1.5 text-sm text-text tabular-nums focus:border-accent transition-colors" />
                            </label>
                            <label className="text-[11px] text-muted">{t('qty')}
                              <input type="number" min={0} value={l.qty} onChange={ev => setLine(i, { qty: ev.target.value })} placeholder="0"
                                className="mt-1 w-full rounded-soft border border-border bg-surface px-3 py-1.5 text-sm text-text tabular-nums focus:border-accent transition-colors" />
                            </label>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
                            <span>{t('cost')}: <span className="text-text-soft tabular-nums">{p?.unitCost != null ? fmtSAR(p.unitCost) : t('noCost')}</span></span>
                            <span>{t('onHand')}: <span className="text-text-soft tabular-nums">{p?.onHand != null ? p.onHand : '—'}</span></span>
                            <span>{t('floor')}: <span className="text-text-soft tabular-nums">{e ? `${e.floor}%` : '—'}</span></span>
                            <span>{t('target')}: <span className="text-text-soft tabular-nums">{e ? `${e.target}%` : '—'}</span></span>
                            {e && (
                              <span className={clsx('ms-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium', V_TONE[e.verdict])}>
                                <Icon className="h-3 w-3" strokeWidth={2.2} />
                                {e.marginPct != null ? `${e.marginPct}% · ` : ''}{t(`v_${e.verdict}`)}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          {/* Live decision summary */}
          <div className="space-y-4">
            <Panel title={t('decision')}>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-soft">{t('total')}</span>
                  <span className="text-text font-semibold tabular-nums">{fmtSAR(evaluation.total)}</span>
                </div>
                <div className={clsx('rounded-soft px-3 py-3 text-sm', evaluation.decision === 'auto_approve' && inputs.length ? 'bg-success-soft text-success' : inputs.length ? 'bg-warn-soft text-warn' : 'bg-bg-soft text-muted')}>
                  {inputs.length === 0 ? t('addToStart')
                    : evaluation.anyBlock ? t('sumBlock')
                    : evaluation.anyReview ? t('sumReview')
                    : evaluation.decision === 'auto_approve' ? t('sumAuto')
                    : t('sumWarn')}
                </div>
                {error && <p className="text-xs text-accent">{t('errorSave')}</p>}
                <button type="button" disabled={!ready || busy} onClick={() => submit(false)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-accent text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" strokeWidth={2} />}
                  {evaluation.decision === 'auto_approve' && !evaluation.anyBlock ? t('submitAuto') : t('submitQueue')}
                </button>
                <p className="text-[11px] text-muted leading-relaxed">{t('gateNote')}</p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* Confirm dialog for below-target (warn) orders */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-text inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warn" strokeWidth={2} />{t('confirmTitle')}</h3>
              <button type="button" onClick={() => setConfirmOpen(false)} className="text-muted hover:text-text"><X className="h-4 w-4" strokeWidth={2} /></button>
            </div>
            <p className="text-sm text-text-soft leading-relaxed">{t('confirmBody')}</p>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" disabled={busy} onClick={() => submit(true)} className="inline-flex items-center gap-1.5 rounded-full bg-warn text-white px-4 py-2 text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}{t('confirmYes')}</button>
              <button type="button" onClick={() => setConfirmOpen(false)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-medium text-text-soft hover:bg-surface-elev transition-colors">{t('confirmNo')}</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
