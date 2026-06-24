'use client'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { AlertTriangle, CheckCircle2, Bell, Info, Eye, AlertOctagon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { getFirmState } from '@/lib/mock/data'
import { getConcernNotes } from '@/lib/data/concerns'
import type { NotificationType } from '@/lib/mock/types'

const TYPE_META: Record<NotificationType, { icon: typeof Bell; tone: string }> = {
  urgent: { icon: AlertTriangle, tone: 'text-accent bg-accent-soft' },
  approval: { icon: CheckCircle2, tone: 'text-warn bg-warn-soft' },
  attention: { icon: Eye, tone: 'text-warn bg-warn-soft' },
  update: { icon: Bell, tone: 'text-success bg-success-soft' },
  info: { icon: Info, tone: 'text-muted bg-bg-soft' },
  concern: { icon: AlertOctagon, tone: 'text-accent bg-accent-soft' }
}
function formatTs(ts: string) { const d = new Date(ts); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` }

export default function NotificationsPage() {
  const tNav = useTranslations('nav'); const tNotif = useTranslations('notif'); const locale = useLocale() as 'en' | 'ar'
  const firm = getFirmState()
  const [live, setLive] = useState<typeof firm.notifications>([])
  const [concerns, setConcerns] = useState<typeof firm.notifications>([])
  const [readAll, setReadAll] = useState(false)
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  useEffect(() => { setConcerns(getConcernNotes(new Date().toISOString()) as unknown as typeof firm.notifications) }, [])
  useEffect(() => {
    const load = () => fetch('/api/notifications').then(r => r.json()).then(d => { if (Array.isArray(d)) setLive(d) }).catch(() => {})
    load(); const id = setInterval(load, 20000); return () => clearInterval(id)
  }, [])
  const items = [...concerns, ...live, ...firm.notifications].filter(n => filter === 'all' || n.type === filter)
  const filters: (NotificationType | 'all')[] = ['all', 'concern', 'urgent', 'approval', 'attention', 'update']
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('notifications') }]}>
      <header className="mb-8 max-w-3xl flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow accent>{tNotif('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>{tNav('notifications')}</DisplayHeading>
        </div>
        <button type="button" onClick={() => setReadAll(true)}
          className="rounded-full border border-border bg-surface hover:bg-surface-elev px-3.5 py-1.5 text-xs font-medium text-text-soft transition-colors">{tNotif('markAll')}</button>
      </header>
      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={clsx('rounded-full px-3 py-1 text-xs font-medium transition-colors border',
              filter === f ? 'bg-accent text-white border-accent' : 'border-border bg-surface text-text-soft hover:bg-surface-elev')}>
            {tNotif(`filter_${f}`)}
          </button>
        ))}
      </div>
      <Panel bodyClassName="px-0 pb-0">
        <ul className="divide-y divide-border">
          {items.map(n => {
            const meta = TYPE_META[n.type]; const Icon = meta.icon; const isRead = readAll || n.read
            return (
              <li key={n.id}>
                <Link href={n.link ?? '/notifications'} className={clsx('flex items-start gap-4 px-5 md:px-6 py-4 hover:bg-surface-elev transition-colors', !isRead && 'bg-accent-soft/30')}>
                  <span className={clsx('shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full', meta.tone)}><Icon className="h-4 w-4" strokeWidth={1.6} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text leading-snug">{n.title[locale]}</p>
                    <p className="text-xs text-muted mt-0.5">{n.deptName[locale]} · {formatTs(n.ts)}</p>
                  </div>
                  {!isRead && <span className="shrink-0 mt-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden />}
                </Link>
              </li>
            )
          })}
          {items.length === 0 && <li className="px-6 py-10 text-sm text-muted text-center">{tNotif('empty')}</li>}
        </ul>
      </Panel>
    </PageShell>
  )
}
