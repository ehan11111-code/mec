'use client'
import { clsx } from 'clsx'
import { useLocale, useTranslations } from 'next-intl'
import { Filter, X } from 'lucide-react'
import { MONTHS, monthLabel, salesBySalesperson, salesByCategory, categoryLabel, type SalesFilter } from '@/lib/data/dataset'

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-xs text-muted whitespace-nowrap">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-text focus:border-accent transition-colors max-w-[160px]">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export function SlicerBar({ filter, onChange }: { filter: SalesFilter; onChange: (f: SalesFilter) => void }) {
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('analytics')
  const reps = salesBySalesperson()
  const cats = salesByCategory()
  const any = filter.month || filter.salesperson || filter.category
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-soft border border-border bg-surface shadow-soft px-4 py-3 mb-6 print:hidden">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-soft"><Filter className="h-3.5 w-3.5 text-accent" strokeWidth={1.8} />{t('filters')}</span>
      <Select label={t('month')} value={filter.month ?? ''} onChange={v => onChange({ ...filter, month: v || undefined })}
        options={[{ value: '', label: t('all') }, ...MONTHS.map(m => ({ value: m, label: monthLabel(m, locale) }))]} />
      <Select label={t('salesperson')} value={filter.salesperson ?? ''} onChange={v => onChange({ ...filter, salesperson: v || undefined })}
        options={[{ value: '', label: t('all') }, ...reps.map(r => ({ value: r.ar, label: locale === 'ar' ? r.ar : r.en }))]} />
      <Select label={t('category')} value={filter.category ?? ''} onChange={v => onChange({ ...filter, category: v || undefined })}
        options={[{ value: '', label: t('all') }, ...cats.map(c => ({ value: c.key, label: categoryLabel(c.key, locale) }))]} />
      {any && (
        <button type="button" onClick={() => onChange({})}
          className={clsx('inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:text-accent hover:border-accent transition-colors')}>
          <X className="h-3 w-3" strokeWidth={2} />{t('clear')}
        </button>
      )}
    </div>
  )
}
