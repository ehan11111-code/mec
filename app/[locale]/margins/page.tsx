'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Percent, Search, Check, RotateCcw, Loader2 } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { getProductList, minMarginFor, fmtSAR } from '@/lib/data/dataset'

export default function MarginsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('margins'); const locale = useLocale() as 'en' | 'ar'
  const products = useMemo(() => getProductList().slice().sort((a, b) => (b.revenue - a.revenue)), [])
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [errItem, setErrItem] = useState<{ item: string; floor: number } | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/margins', { cache: 'no-store' }).then(r => r.json()).then(d => { if (d.overrides) setOverrides(d.overrides) }).catch(() => {})
  }, [])

  const floorOf = (p: { category: string; item: string }) => minMarginFor(p.category, p.item)
  const targetOf = (item: string, floor: number) => (typeof overrides[item] === 'number' ? overrides[item] : floor)
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter(p => !s || p.item.toLowerCase().includes(s) || p.category.toLowerCase().includes(s))
  }, [products, q])
  const customized = Object.keys(overrides).length

  async function save(item: string, floor: number) {
    const raw = edits[item]; if (raw == null || raw === '') return
    const target = Number(raw)
    if (!isFinite(target) || target < floor) { setErrItem({ item, floor }); return }
    setErrItem(null); setSaving(item)
    try {
      const r = await fetch('/api/margins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item, target }) })
      const d = await r.json()
      if (r.ok && d.ok) { setOverrides(o => ({ ...o, [item]: target })); setEdits(e => { const n = { ...e }; delete n[item]; return n }) }
      else if (d.error === 'below_floor') setErrItem({ item, floor: d.floor ?? floor })
    } catch { /* ignore */ }
    setSaving(null)
  }
  async function resetToFloor(item: string) {
    setSaving(item); setErrItem(null)
    try {
      const r = await fetch('/api/margins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item, target: null }) })
      if (r.ok) { setOverrides(o => { const n = { ...o }; delete n[item]; return n }); setEdits(e => { const n = { ...e }; delete n[item]; return n }) }
    } catch { /* ignore */ }
    setSaving(null)
  }

  return (
    <PageShell requires="pricing" breadcrumbs={[{ label: tNav('secSales') }, { label: tNav('targetMargins') }]}>
      <header className="mb-7 max-w-2xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      <NoteCallout className="mb-6" title={t('noteTitle')}>{t('note')}</NoteCallout>

      <Panel bodyClassName="px-0 pb-0" title={t('title')}
        action={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted hidden sm:inline">{t('customized', { n: customized })}</span>
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted" strokeWidth={1.7} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={t('searchPh')}
                className="w-36 md:w-52 rounded-full border border-border bg-surface ps-8 pe-3 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent transition-colors" />
            </div>
          </div>
        }>
        {shown.length === 0 ? (
          <EmptyState icon={Percent} title={t('noMatch')} />
        ) : (
          <div className="overflow-x-auto scrollbar-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted border-b border-border">
                  <th className="text-start font-medium px-5 md:px-6 py-3">{t('colProduct')}</th>
                  <th className="text-start font-medium px-4 py-3 hidden md:table-cell">{t('colCategory')}</th>
                  <th className="text-end font-medium px-4 py-3 hidden lg:table-cell">{t('colCost')}</th>
                  <th className="text-end font-medium px-4 py-3 hidden lg:table-cell">{t('colRealized')}</th>
                  <th className="text-end font-medium px-4 py-3">{t('colFloor')}</th>
                  <th className="text-end font-medium px-5 md:px-6 py-3">{t('colTarget')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map(p => {
                  const floor = floorOf(p)
                  const cur = targetOf(p.item, floor)
                  const val = edits[p.item] ?? String(cur)
                  const changed = edits[p.item] !== undefined && edits[p.item] !== '' && Number(edits[p.item]) !== cur
                  const isCustom = typeof overrides[p.item] === 'number'
                  const err = errItem?.item === p.item
                  return (
                    <tr key={p.item} className="hover:bg-surface-elev transition-colors">
                      <td className="px-5 md:px-6 py-3">
                        <span className="text-text" dir="auto">{p.item}</span>
                        {isCustom && <span className="ms-2 inline-flex items-center rounded-full bg-accent-soft text-accent px-1.5 py-0.5 text-[9px] font-medium">{t('custom')}</span>}
                      </td>
                      <td className="px-4 py-3 text-text-soft hidden md:table-cell">{locale === 'ar' ? p.categoryAr : p.category}</td>
                      <td className="px-4 py-3 text-end text-text-soft tabular-nums hidden lg:table-cell">{p.unitCost != null ? fmtSAR(p.unitCost) : '—'}</td>
                      <td className={clsx('px-4 py-3 text-end tabular-nums hidden lg:table-cell', p.marginPct != null && p.marginPct < floor ? 'text-accent' : 'text-text-soft')}>{p.marginPct != null ? `${p.marginPct}%` : '—'}</td>
                      <td className="px-4 py-3 text-end text-muted tabular-nums">{floor}%</td>
                      <td className="px-5 md:px-6 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="relative">
                            <input type="number" min={floor} max={95} value={val}
                              onChange={e => setEdits(x => ({ ...x, [p.item]: e.target.value }))}
                              className={clsx('w-20 rounded-soft border bg-surface pe-6 ps-2 py-1 text-sm text-text text-end tabular-nums focus:border-accent transition-colors', err ? 'border-accent' : 'border-border')} />
                            <span className="absolute end-2 top-1/2 -translate-y-1/2 text-[11px] text-muted">%</span>
                          </div>
                          {changed && (
                            <button type="button" disabled={saving === p.item} onClick={() => save(p.item, floor)} title={t('save')}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-accent text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                              {saving === p.item ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" strokeWidth={2.4} />}
                            </button>
                          )}
                          {isCustom && !changed && (
                            <button type="button" disabled={saving === p.item} onClick={() => resetToFloor(p.item)} title={t('resetFloor')}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-full border border-border text-muted hover:text-accent hover:bg-accent-soft disabled:opacity-50 transition-colors">
                              {saving === p.item ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.9} />}
                            </button>
                          )}
                        </div>
                        {err && <p className="text-[10px] text-accent text-end mt-1">{t('belowFloor', { floor: errItem!.floor })}</p>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 md:px-6 py-3 border-t border-border text-xs text-muted">{t('showing', { n: shown.length, total: products.length })}</div>
      </Panel>
    </PageShell>
  )
}
