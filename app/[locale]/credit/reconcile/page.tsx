'use client'
import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Wallet, ArrowRight, Check, Loader2, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { StatCard } from '@/components/StatCard'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { fmtSAR } from '@/lib/data/dataset'
import { fmtDate } from '@/lib/format/datetime'

type Proposal = { message_id: string; received_at: string; noteText: string; amount: number; who: string | null; matchedClient: string | null; currentOutstanding: number | null; proposedOutstanding: number | null; confidence: 'high' | 'medium' | 'low'; hasFile: boolean }
type Adjustment = { id: number; client: string | null; amount: number; source_message_id: string | null; note: string | null; confirmed_by: string | null; confirmed_at: string }
type Recon = { asOf: string; statementTotal: number; confirmedTotal: number; effectiveTotal: number; proposals: Proposal[]; adjustments: Adjustment[] }

const CONF = { high: 'bg-success-soft text-success', medium: 'bg-warn-soft text-warn', low: 'bg-bg-soft text-muted' } as const

export default function CreditReconcilePage() {
  const tNav = useTranslations('nav'); const t = useTranslations('credit'); const locale = useLocale() as 'en' | 'ar'
  const [data, setData] = useState<Recon | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/credit/reconcile', { cache: 'no-store' }).then(r => r.json()).then(d => { if (!d.error) setData(d) }).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function confirm(p: Proposal) {
    setBusy(p.message_id)
    try {
      const r = await fetch('/api/credit/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message_id: p.message_id, client: p.matchedClient || p.who, amount: p.amount, note: p.noteText }) })
      if (r.ok) load()
    } catch { /* ignore */ }
    setBusy(null)
  }

  return (
    <PageShell requires="finance" breadcrumbs={[{ label: tNav('credit') }, { label: t('reconTitle') }]}>
      <header className="mb-7 max-w-3xl">
        <Eyebrow accent>{t('reconEyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('reconTitle')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('reconSub')}</p>
      </header>

      <section className="mb-7 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('reconStatement')} amount={data?.statementTotal ?? 0} delta={data ? fmtDate(data.asOf, locale) : ''} index={0} />
        <StatCard label={t('reconConfirmed')} amount={data?.confirmedTotal ?? 0} delta={t('reconConfirmedSub')} index={1} />
        <StatCard label={t('reconEffective')} amount={data?.effectiveTotal ?? 0} accent delta={t('reconEffectiveSub')} index={2} />
        <StatCard label={t('reconPending')} value={data ? String(data.proposals.length) : '—'} accent delta={t('reconPendingSub')} index={3} />
      </section>

      <NoteCallout className="mb-6" tone="info" title={t('reconProofTitle')}>{t('reconProofBody')}</NoteCallout>

      <Panel className="mb-6" bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-accent" strokeWidth={1.8} />{t('reconProposals')}</span>} subtitle={t('reconProposalsSub')}>
        {data === null ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
        ) : data.proposals.length === 0 ? (
          <EmptyState icon={CheckCircle2} title={t('reconEmpty')} hint={t('reconEmptyHint')} source="WhatsApp · payments" />
        ) : (
          <ul className="divide-y divide-border">
            {data.proposals.map(p => (
              <li key={p.message_id} className="px-5 md:px-6 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold tabular-nums text-text">{fmtSAR(p.amount)}</span>
                      <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', CONF[p.confidence])}>{t(`reconConf_${p.confidence}`)}</span>
                      <span className="text-[11px] text-muted tabular-nums">{fmtDate(p.received_at, locale)}</span>
                      {p.hasFile && <a href={`/api/wa-file?id=${encodeURIComponent(p.message_id)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-accent/80 hover:text-accent"><FileText className="h-3 w-3" strokeWidth={1.8} />{t('reconOpen')}</a>}
                    </div>
                    <p className="mt-1 text-xs text-text-soft leading-snug line-clamp-2" dir="auto">{p.noteText}</p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] flex-wrap" dir="auto">
                      {p.matchedClient ? (
                        <>
                          <span className="text-text font-medium">{p.matchedClient}</span>
                          {p.currentOutstanding != null && <><span className="text-muted tabular-nums">{fmtSAR(p.currentOutstanding)}</span><ArrowRight className="h-3 w-3 text-accent shrink-0" strokeWidth={2} /><span className="text-success font-medium tabular-nums">{fmtSAR(p.proposedOutstanding ?? 0)}</span></>}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-warn"><AlertTriangle className="h-3 w-3" strokeWidth={2} />{t('reconUnmatched')}{p.who ? ` · ${p.who}` : ''}</span>
                      )}
                    </div>
                  </div>
                  <button type="button" disabled={busy === p.message_id} onClick={() => confirm(p)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-3.5 py-1.5 text-xs font-medium hover:bg-accent-strong disabled:opacity-60 transition-colors">
                    {busy === p.message_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2} />}{t('reconConfirm')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {!!data?.adjustments.length && (
        <Panel bodyClassName="px-0 pb-0" title={<span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" strokeWidth={1.8} />{t('reconConfirmedList')}</span>} subtitle={t('reconConfirmedListSub')}>
          <ul className="divide-y divide-border">
            {data.adjustments.map(a => (
              <li key={a.id} className="px-5 md:px-6 py-2.5 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <span className="text-text font-medium truncate" dir="auto">{a.client || '—'}</span>
                  <span className="ms-2 text-[11px] text-muted">{a.confirmed_by ? t('reconBy', { who: a.confirmed_by }) : ''} · {fmtDate(a.confirmed_at, locale)}</span>
                </div>
                <span className="shrink-0 tabular-nums text-success font-medium">− {fmtSAR(a.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </PageShell>
  )
}
