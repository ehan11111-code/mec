'use client'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Bell, AlertTriangle, CheckCircle2, Eye, Info, AlertOctagon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
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

type LiveNote = { id: string; type: NotificationType; title: { en: string; ar: string }; deptName: { en: string; ar: string }; ts: string; read: boolean; link: string }

export function NotificationBell() {
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('notif')
  const firm = getFirmState()
  const [live, setLive] = useState<LiveNote[]>([])
  const [concerns, setConcerns] = useState<LiveNote[]>([])
  const all = [...concerns, ...live, ...firm.notifications]
  const items = all.slice(0, 6)
  const unread = all.filter(n => !n.read).length
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setConcerns(getConcernNotes(new Date().toISOString())) }, [])
  useEffect(() => {
    const load = () => fetch('/api/notifications').then(r => r.json()).then(d => { if (Array.isArray(d)) setLive(d) }).catch(() => {})
    load()
    const id = setInterval(load, 20000) // keep notifications fresh
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label={t('eyebrow')}
        className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-elev transition-colors">
        <Bell className="h-4 w-4 text-text-soft" strokeWidth={1.7} />
        {unread > 0 && <span className="absolute -top-1 -end-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold leading-none">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-[340px] max-w-[calc(100vw-2rem)] rounded-soft border border-border bg-surface shadow-float z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-text">{t('eyebrow')}</span>
            <span className="text-xs text-muted">{unread} {locale === 'ar' ? 'غير مقروء' : 'unread'}</span>
          </div>
          <ul className="max-h-[360px] overflow-y-auto scrollbar-soft divide-y divide-border">
            {items.map(n => {
              const meta = TYPE_META[n.type]; const Icon = meta.icon
              return (
                <li key={n.id}>
                  <Link href={n.link ?? '/notifications'} onClick={() => setOpen(false)}
                    className={clsx('flex items-start gap-3 px-4 py-3 hover:bg-surface-elev transition-colors', !n.read && 'bg-accent-soft/25')}>
                    <span className={clsx('shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full', meta.tone)}><Icon className="h-3.5 w-3.5" strokeWidth={1.7} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-text leading-snug line-clamp-2">{n.title[locale]}</p>
                      <p className="text-[11px] text-muted mt-0.5">{n.deptName[locale]} · {formatTs(n.ts)}</p>
                    </div>
                  </Link>
                </li>
              )
            })}
            {items.length === 0 && <li className="px-4 py-8 text-center text-xs text-muted">{t('empty')}</li>}
          </ul>
          <Link href="/notifications" onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium text-accent hover:bg-surface-elev px-4 py-3 border-t border-border transition-colors">
            {locale === 'ar' ? 'عرض كل الإشعارات' : 'View all notifications'}
          </Link>
        </div>
      )}
    </div>
  )
}
