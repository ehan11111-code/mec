'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { FileText, Loader2 } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'

// Generates the full company overview report (deterministic sections + AI suggestions, permission-scoped)
// and opens the printable viewer.
export function CompanyReportButton({ className }: { className?: string }) {
  const t = useTranslations('report'); const locale = useLocale() as 'en' | 'ar'
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const go = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ overview: true, locale }) })
      if (r.ok) { const d = await r.json(); sessionStorage.setItem('mec_report', JSON.stringify(d.spec)); router.push('/report') }
    } catch { /* ignore */ }
    setBusy(false)
  }

  return (
    <button type="button" onClick={go} disabled={busy} className={`inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2 text-xs font-medium hover:bg-accent-strong disabled:opacity-60 transition-colors print:hidden ${className ?? ''}`}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" strokeWidth={1.9} />}{t('generate')}
    </button>
  )
}
