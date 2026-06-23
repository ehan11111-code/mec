'use client'
import { useTranslations } from 'next-intl'
import { Printer, FileSpreadsheet, FileDown } from 'lucide-react'
import { exportCsv, exportExcel, printReport, type Row } from '@/lib/export/exporters'

export function ExportBar({ rows, filename, className }: { rows?: () => Row[]; filename: string; className?: string }) {
  const t = useTranslations('analytics')
  const get = () => (rows ? rows() : [])
  const btn = 'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev text-text-soft hover:text-text px-3 py-1.5 text-xs font-medium transition-colors'
  return (
    <div className={`flex items-center gap-2 print:hidden ${className ?? ''}`}>
      <button type="button" onClick={printReport} className={btn}><Printer className="h-3.5 w-3.5" strokeWidth={1.7} />{t('print')}</button>
      {rows && <button type="button" onClick={() => exportExcel(get(), filename)} className={btn}><FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.7} />{t('excel')}</button>}
      {rows && <button type="button" onClick={() => exportCsv(get(), filename)} className={btn}><FileDown className="h-3.5 w-3.5" strokeWidth={1.7} />CSV</button>}
    </div>
  )
}
