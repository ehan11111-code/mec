'use client'
import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { clearSession, getSession } from '@/lib/auth'
import { LocaleToggle } from './LocaleToggle'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'
import { LogOut, ChevronRight } from 'lucide-react'
import { getFirmState } from '@/lib/mock/data'
export function TopBar({ breadcrumbs }: { breadcrumbs: { label: string; href?: string }[] }) {
  const router = useRouter(); const locale = useLocale() as 'en' | 'ar'
  const [email, setEmail] = useState('demo@user'); const firm = getFirmState()
  useEffect(() => { const s = getSession(); if (s?.email) setEmail(s.email) }, [])
  return (
    <div className="border-b border-border bg-bg/85 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-3.5">
        <nav aria-label="breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-sm text-muted overflow-hidden">
            {breadcrumbs.map((c, i) => (<li key={i} className="flex items-center gap-1.5 truncate">{i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted/60 flip-rtl" strokeWidth={1.6} />}<span className={i === breadcrumbs.length - 1 ? 'text-text font-medium' : ''}>{c.label}</span></li>))}
          </ol>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden />
            <span className="text-xs text-text-soft">{email}</span><span className="text-xs text-muted">·</span><span className="text-xs text-muted">{firm.clientName}</span>
          </div>
          <NotificationBell /><ThemeToggle /><LocaleToggle />
          <button type="button" onClick={() => { clearSession(); router.replace('/login') }} className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-elev transition-colors" aria-label={locale === 'ar' ? 'تسجيل الخروج' : 'Sign out'}>
            <LogOut className="h-4 w-4 text-text-soft" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </div>
  )
}
