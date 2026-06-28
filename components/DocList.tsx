'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { FileText, Receipt, Truck, RefreshCw, Loader2, ExternalLink, Search, Users2, FileType2 } from 'lucide-react'
import { PageShell } from './PageShell'
import { DisplayHeading } from './DisplayHeading'
import { Eyebrow } from './Eyebrow'
import { Panel } from './Panel'
import { StatCard } from './StatCard'
import { EmptyState } from './EmptyState'
import { fmtDateTime } from '@/lib/format/datetime'
import type { WaDoc } from '@/app/api/wa-docs/route'

type DocType = 'invoice' | 'payment' | 'delivery_note'
const ICON: Record<DocType, typeof FileText> = { invoice: FileText, payment: Receipt, delivery_note: Truck }

// One reusable registry of every WhatsApp document of a given type (invoice / payment / delivery note).
// Lists everything the intake fetched, newest first, with the original file openable (decrypted on demand).
export function DocList({ type }: { type: DocType }) {
  const tNav = useTranslations('nav'); const t = useTranslations('waDocs'); const locale = useLocale() as 'en' | 'ar'
  const [docs, setDocs] = useState<WaDoc[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [q, setQ] = useState('')
  const [withFileOnly, setWithFileOnly] = useState(false)
  const Icon = ICON[type]

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true)
    try { const d = await fetch(`/api/wa-docs?type=${type}`, { cache: 'no-store' }).then(r => r.json()); if (Array.isArray(d.docs)) setDocs(d.docs) }
    catch { setDocs(x => x ?? []) }
    if (manual) setRefreshing(false)
  }, [type])
  useEffect(() => { load(); const id = setInterval(() => load(), 30000); return () => clearInterval(id) }, [load])

  const list = docs ?? []
  const withFile = useMemo(() => list.filter(d => d.hasFile).length, [list])
  const latest = list[0]?.received_at
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return list.filter(d =>
      (!withFileOnly || d.hasFile) &&
      (!s || d.filename.toLowerCase().includes(s) || (d.client_name || '').toLowerCase().includes(s) || d.sender.toLowerCase().includes(s) || (d.order_no || '').toLowerCase().includes(s)))
  }, [list, q, withFileOnly])

  return (
    <PageShell requires="documents" breadcrumbs={[{ label: tNav('documents') }, { label: t(`title_${type}`) }]}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{t(`title_${type}`)}</DisplayHeading>
          <p className="text-base text-text-soft mt-3 leading-relaxed">{t(`sub_${type}`)}</p>
        </div>
        <button type="button" onClick={() => load(true)} disabled={refreshing} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-2 text-xs font-medium text-text-soft transition-colors disabled:opacity-60">
          <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} strokeWidth={1.9} />{t('refresh')}
        </button>
      </header>

      <section className="mb-6 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label={t('kTotal')} value={docs ? String(list.length) : '—'} index={0} accent />
        <StatCard label={t('kWithFile')} value={docs ? String(withFile) : '—'} index={1} />
        <StatCard label={t('kLatest')} value={latest ? fmtDateTime(latest, locale) : '—'} index={2} />
      </section>

      <Panel bodyClassName="px-0 pb-0" title={t(`title_${type}`)}
        action={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setWithFileOnly(v => !v)}
              className={clsx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors', withFileOnly ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>
              {t('withFileOnly')}
            </button>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" strokeWidth={1.7} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPh')}
                className="w-36 md:w-52 rounded-full border border-border bg-surface ps-8 pe-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent transition-colors" />
            </div>
          </div>
        }>
        {docs === null ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
        ) : shown.length === 0 ? (
          <EmptyState icon={Icon} title={list.length === 0 ? t('empty') : t('noMatch')} hint={list.length === 0 ? t('emptyHint') : undefined} source={t('source')} />
        ) : (
          <div className="overflow-x-auto scrollbar-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="text-start font-medium px-5 md:px-6 py-3">{t('colFile')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden md:table-cell">{t('colClient')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">{t('colSender')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden lg:table-cell">{t('colChannel')}</th>
                  <th className="text-start font-medium px-4 py-3">{t('colDate')}</th>
                  <th className="text-end font-medium px-5 md:px-6 py-3">{t('colOpen')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map(d => (
                  <tr key={d.message_id} className="hover:bg-surface-elev transition-colors">
                    <td className="px-5 md:px-6 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 text-accent shrink-0" strokeWidth={1.7} />
                        <span className="text-text truncate max-w-[260px]" dir="auto">{d.filename || t('untitled')}</span>
                      </div>
                      {d.order_no && <div className="text-[11px] text-muted mt-0.5 ms-6">{t('orderNo', { no: d.order_no })}</div>}
                    </td>
                    <td className="px-4 py-3 text-text-soft hidden md:table-cell max-w-[200px] truncate" dir="auto">{d.client_name || '—'}</td>
                    <td className="px-4 py-3 text-text-soft hidden lg:table-cell">{d.sender}</td>
                    <td className="px-4 py-3 hidden lg:table-cell"><span className="inline-flex items-center gap-1 text-[11px] text-text-soft"><Users2 className="h-3 w-3" strokeWidth={1.8} />{d.channel}</span></td>
                    <td className="px-4 py-3 text-muted tabular-nums whitespace-nowrap">{fmtDateTime(d.received_at, locale)}</td>
                    <td className="px-5 md:px-6 py-3 text-end">
                      {d.hasFile
                        ? <a href={`/api/wa-file?id=${encodeURIComponent(d.message_id)}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-opacity">
                            <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />{t('open')}
                          </a>
                        : <span className="inline-flex items-center gap-1 text-[11px] text-muted"><FileType2 className="h-3 w-3" strokeWidth={1.8} />{t('noFile')}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 md:px-6 py-3 border-t border-border text-xs text-muted">{t('showing', { n: shown.length, total: list.length })}</div>
      </Panel>

      <p className="mt-6 text-xs text-muted leading-relaxed max-w-3xl">{t('note')}</p>
    </PageShell>
  )
}
