'use client'
import { useLocale } from 'next-intl'
import { LocaleToggle } from './LocaleToggle'
import { ThemeToggle } from './ThemeToggle'
import { NotificationBell } from './NotificationBell'
import { ProfileMenu } from './ProfileMenu'
import { ChevronRight } from 'lucide-react'
import { getFirmState } from '@/lib/mock/data'
export function TopBar({ breadcrumbs }: { breadcrumbs: { label: string; href?: string }[] }) {
  const locale = useLocale() as 'en' | 'ar'; const firm = getFirmState()
  return (
    <div className="border-b border-border bg-bg/85 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-3.5">
        <nav aria-label="breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-sm text-muted overflow-hidden">
            {breadcrumbs.map((c, i) => (<li key={i} className="flex items-center gap-1.5 truncate">{i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted/60 flip-rtl" strokeWidth={1.6} />}<span className={i === breadcrumbs.length - 1 ? 'text-text font-medium' : ''}>{c.label}</span></li>))}
          </ol>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden lg:inline text-xs text-muted">{firm.clientName}</span>
          <NotificationBell /><ThemeToggle /><LocaleToggle />
          <ProfileMenu />
        </div>
      </div>
    </div>
  )
}
