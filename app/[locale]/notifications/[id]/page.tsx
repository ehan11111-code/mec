'use client'
import { use, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { ArrowLeft, AlertOctagon, MessageCircle, Radar, Check, X, Loader2, ExternalLink, Bell } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { getConcernById, getConcernEvidence } from '@/lib/data/concerns'
import { getFirmState } from '@/lib/mock/data'
import type { WhatsappMsg } from '@/lib/data/supply'

const sevTone: Record<string, string> = { high: 'text-accent', medium: 'text-warn', low: 'text-muted', info: 'text-muted' }

export default function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = use(params)
  const id = decodeURIComponent(raw)
  const tNav = useTranslations('nav'); const t = useTranslations('notifDetail'); const locale = useLocale() as 'en' | 'ar'

  const kind = id.startsWith('concern-') ? 'concern' : id.startsWith('wa-order-') ? 'order' : id.startsWith('si-') ? 'supply' : 'other'

  return (
    <PageShell breadcrumbs={[{ label: tNav('notifications') }, { label: t('message') }]}>
      <Link href="/notifications" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors mb-5">
        <ArrowLeft className="h-3.5 w-3.5 flip-rtl" strokeWidth={1.7} />{t('back')}
      </Link>
      {kind === 'concern' ? <ConcernView cid={id.slice('concern-'.length)} />
        : kind === 'order' ? <OrderView messageId={id.slice('wa-order-'.length)} />
          : kind === 'supply' ? <SupplyView id={id} />
            : <OtherView id={id} />}
    </PageShell>
  )
}

function ConcernView({ cid }: { cid: string }) {
  const t = useTranslations('notifDetail'); const tc = useTranslations('concerns'); const locale = useLocale() as 'en' | 'ar'
  const concern = getConcernById(cid)
  const ev = getConcernEvidence(cid)
  if (!concern) return <Empty />
  return (
    <>
      <header className="mb-6 max-w-3xl">
        <div className="flex items-center gap-2">
          <Eyebrow accent>{t('concern')}</Eyebrow>
          <span className={clsx('text-[11px] font-semibold uppercase', sevTone[concern.severity])}>{concern.severity}</span>
        </div>
        <DisplayHeading size="md" className="mt-3" locale={locale}>{concern.title[locale]}</DisplayHeading>
      </header>

      <Panel className="mb-5 max-w-3xl" title={<span className="inline-flex items-center gap-2"><AlertOctagon className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('whatWeSee')}</span>}>
        <p className="text-sm text-text-soft leading-relaxed">{concern.detail[locale]}</p>
      </Panel>

      {(ev.stats || ev.table) && (
        <Panel className="mb-5" title={t('demonstration')}>
          {ev.stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {ev.stats.map((s, i) => (
                <div key={i} className="rounded-soft border border-border bg-bg-soft px-3 py-2.5">
                  <div className="text-[11px] text-muted">{s.label[locale]}</div>
                  <div className="text-base font-display font-semibold tabular-nums text-text mt-0.5">{s.value}</div>
                </div>
              ))}
            </div>
          )}
          {ev.table && (
            <div className="overflow-x-auto scrollbar-soft">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-muted border-b border-border">
                  {ev.table.columns.map((c, i) => <th key={i} className={clsx('font-medium py-2.5 px-3', i === 0 ? 'text-start' : 'text-end')}>{c[locale]}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-border">
                  {ev.table.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-surface-elev transition-colors">
                      {row.map((cell, j) => <td key={j} className={clsx('py-2.5 px-3 tabular-nums', j === 0 ? 'text-start text-text max-w-[280px] truncate' : 'text-end text-text-soft')}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <NoteCallout className="max-w-3xl" title={tc('likelyCause')}>{concern.conclusion[locale]}</NoteCallout>
    </>
  )
}

function OrderView({ messageId }: { messageId: string }) {
  const t = useTranslations('notifDetail'); const ta = useTranslations('approvals'); const locale = useLocale() as 'en' | 'ar'
  const [order, setOrder] = useState<WhatsappMsg | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const load = () => fetch('/api/approvals').then(r => r.json()).then((d: WhatsappMsg[]) => {
    if (Array.isArray(d)) setOrder(d.find(o => o.message_id === messageId) ?? null)
  }).catch(() => setOrder(null))
  useEffect(() => { load() }, [])
  const decide = async (decision: 'approved' | 'rejected') => {
    if (!order) return
    setBusy(true)
    try { await fetch('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: order.message_id, decision }) }); await load() } catch { /* ignore */ }
    setBusy(false)
  }
  const fmt = (s: string) => { try { return new Date(s).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) } catch { return '—' } }
  if (order === undefined) return <div className="flex items-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
  if (order === null) return <Empty />
  const status = (order.order_status as string) || 'pending'
  return (
    <>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{t('order')}</Eyebrow>
        <DisplayHeading size="md" className="mt-3" locale={locale}>{order.push_name || order.phone}</DisplayHeading>
        <p className="text-xs text-muted mt-1 tabular-nums">{order.phone} · {fmt(order.received_at)}</p>
      </header>
      <Panel className="mb-5 max-w-3xl" title={<span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('orderItems')}</span>}>
        {order.products?.length ? (
          <ul className="space-y-1.5 mb-4">
            {order.products.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-md bg-bg-soft px-3 py-2 text-sm">
                <span className="text-text">{p.name}</span><span className="text-text-soft tabular-nums">{p.qty ?? ''}{p.unit ? ` ${p.unit}` : ''}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted italic mb-4">{ta('noProducts')}</p>}
        <p className="text-xs text-muted leading-relaxed border-s-2 border-border ps-3">{order.body}</p>
        <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
          {status === 'pending' ? (
            <>
              <button type="button" disabled={busy} onClick={() => decide('approved')} className="inline-flex items-center gap-1.5 rounded-full bg-success text-white px-4 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-60 transition-opacity">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.2} />}{ta('approve')}
              </button>
              <button type="button" disabled={busy} onClick={() => decide('rejected')} className="inline-flex items-center gap-1.5 rounded-full border border-border text-text-soft px-4 py-1.5 text-xs font-medium hover:bg-surface-elev disabled:opacity-60 transition-colors">
                <X className="h-3.5 w-3.5" strokeWidth={2.2} />{ta('reject')}
              </button>
            </>
          ) : (
            <span className={clsx('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium', status === 'approved' ? 'bg-success-soft text-success' : 'bg-bg-soft text-muted')}>{ta(`tab_${status}`)}</span>
          )}
          <Link href="/approvals" className="ms-auto inline-flex items-center gap-1 text-xs text-accent hover:underline">{t('openQueue')}<ExternalLink className="h-3 w-3" strokeWidth={1.8} /></Link>
        </div>
      </Panel>
    </>
  )
}

function SupplyView({ id }: { id: string }) {
  const t = useTranslations('notifDetail'); const locale = useLocale() as 'en' | 'ar'
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => { fetch('/api/supply-intel').then(r => r.json()).then(d => setRows(Array.isArray(d) ? d : [])).catch(() => setRows([])) }, [])
  if (rows === null) return <div className="flex items-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
  // id = si-price-<supplier> or si-risk-<supplier>-<...>
  const rest = id.replace(/^si-(price|risk)-/, '')
  const row = rows.find(r => rest.startsWith(r.supplier)) || rows[0]
  if (!row) return <Empty />
  return (
    <>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{t('marketAlert')}</Eyebrow>
        <DisplayHeading size="md" className="mt-3" locale={locale}>{row.supplier} · {row.commodity}</DisplayHeading>
        <p className="text-sm text-text-soft mt-1">{row.country}{row.recommendation ? ` — ${row.recommendation}` : ''}</p>
      </header>
      {row.price_outlook && (
        <Panel className="mb-5 max-w-3xl" title={<span className="inline-flex items-center gap-2"><Radar className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('priceOutlook')}</span>}>
          <p className="text-sm text-text-soft">{t('direction')}: <span className="font-medium text-text">{row.price_outlook.direction} {row.price_outlook.change_pct}%</span></p>
          <ul className="mt-3 space-y-2">
            {(row.price_outlook.drivers || []).slice(0, 5).map((d: any, i: number) => (
              <li key={i} className="text-xs text-text-soft flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />{d.summary}{d.citation?.url && <a href={d.citation.url} target="_blank" rel="noopener noreferrer" className="ms-1 text-accent hover:underline inline-flex items-center gap-0.5">{d.citation.source || 'source'}<ExternalLink className="h-3 w-3" /></a>}</li>
            ))}
          </ul>
        </Panel>
      )}
      {(row.risks || []).length > 0 && (
        <Panel className="mb-5" title={t('risks')}>
          <ul className="space-y-2">
            {row.risks.map((r: any, i: number) => (
              <li key={i} className="text-xs flex items-start gap-2"><span className={clsx('mt-1 h-1.5 w-1.5 rounded-full shrink-0', r.severity === 'high' ? 'bg-accent' : r.severity === 'medium' ? 'bg-warn' : 'bg-muted')} /><span className="text-text-soft">{r.summary}{r.citation?.url && <a href={r.citation.url} target="_blank" rel="noopener noreferrer" className="ms-1 text-accent hover:underline inline-flex items-center gap-0.5">{r.citation.source || 'source'}<ExternalLink className="h-3 w-3" /></a>}</span></li>
            ))}
          </ul>
        </Panel>
      )}
      <Link href="/supply-intelligence" className="inline-flex items-center gap-1 text-xs text-accent hover:underline">{t('openSupply')}<ExternalLink className="h-3 w-3" strokeWidth={1.8} /></Link>
    </>
  )
}

function OtherView({ id }: { id: string }) {
  const t = useTranslations('notifDetail'); const locale = useLocale() as 'en' | 'ar'
  const firm = getFirmState()
  const n = firm.notifications.find(x => x.id === id)
  if (!n) return <Empty />
  return (
    <>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{n.deptName[locale]}</Eyebrow>
        <DisplayHeading size="md" className="mt-3" locale={locale}>{n.title[locale]}</DisplayHeading>
      </header>
      {n.body && <Panel className="max-w-3xl"><p className="text-sm text-text-soft leading-relaxed">{n.body[locale]}</p></Panel>}
    </>
  )
}

function Empty() {
  const t = useTranslations('notifDetail')
  return (
    <div className="flex flex-col items-center justify-center text-center gap-2 py-20">
      <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-bg-soft text-muted mb-1"><Bell className="h-5 w-5" strokeWidth={1.6} /></span>
      <p className="text-sm text-text-soft">{t('notFound')}</p>
      <Link href="/notifications" className="text-xs text-accent hover:underline">{t('back')}</Link>
    </div>
  )
}
