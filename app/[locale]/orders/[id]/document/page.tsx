'use client'
import { use, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Printer, ArrowLeft, Loader2 } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { Link } from '@/i18n/navigation'
import { O2CDocument, type DocData, type DocKind } from '@/components/o2c/O2CDocument'

export default function OrderDocumentPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id } = use(params)
  const t = useTranslations('orderDoc'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en' | 'ar'
  const [data, setData] = useState<DocData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [kind, setKind] = useState<DocKind>('invoice')

  useEffect(() => {
    fetch(`/api/orders/${encodeURIComponent(id)}`, { cache: 'no-store' })
      .then(r => { if (!r.ok) { setNotFound(true); return null } return r.json() })
      .then(d => { if (d && !d.error) setData(d); else if (d?.error) setNotFound(true) })
      .catch(() => setNotFound(true))
  }, [id])

  const kinds: DocKind[] = ['invoice', 'po', 'delivery']
  return (
    <PageShell requires="orders" breadcrumbs={[{ label: tNav('orders') }, { label: t('title') }]}>
      <div className="print:hidden mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/approvals" className="inline-flex items-center gap-1.5 text-sm text-text-soft hover:text-text transition-colors" locale={locale}>
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />{t('back')}
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-border bg-surface p-1">
            {kinds.map(k => (
              <button key={k} type="button" onClick={() => setKind(k)}
                className={clsx('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', kind === k ? 'bg-accent text-white' : 'text-text-soft hover:text-text')}>
                {t(`kind_${k}`)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => window.print()} disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-4 py-2 text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Printer className="h-3.5 w-3.5" strokeWidth={2} />{t('print')}
          </button>
        </div>
      </div>

      {notFound ? (
        <div className="text-center py-16 text-sm text-muted">{t('notFound')}</div>
      ) : !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
      ) : (
        <>
          {!data.hasPrices && kind !== 'delivery' && <p className="print:hidden mb-3 text-center text-xs text-warn">{t('noPrices')}</p>}
          <O2CDocument data={data} kind={kind} />
        </>
      )}
    </PageShell>
  )
}
