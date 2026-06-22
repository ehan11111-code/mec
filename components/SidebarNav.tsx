'use client'
import { useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { clsx } from 'clsx'
import { LayoutDashboard, Network, GraduationCap, Mail, ChevronDown, Bell, Coins, ShoppingCart, Users } from 'lucide-react'
import { BrandLogo } from './BrandLogo'
import { departmentSeeds } from '@/lib/mock/catalog'
import { getFirmState } from '@/lib/mock/data'

type Item = { href: string; label: string; icon: typeof LayoutDashboard; badge?: number }

export function SidebarNav() {
  const pathname = usePathname(); const locale = useLocale() as 'en' | 'ar'
  const tNav = useTranslations('nav'); const tCommon = useTranslations('common')
  const firm = getFirmState()
  const unread = firm.notifications.filter(n => !n.read).length
  const [deptsOpen, setDeptsOpen] = useState(true)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const top: Item[] = [
    { href: '/control-center', label: tNav('controlCenter'), icon: LayoutDashboard },
    { href: '/orders', label: tNav('orders'), icon: ShoppingCart },
    { href: '/clients', label: tNav('clients'), icon: Users }
  ]
  const bottom: Item[] = [
    { href: '/total-savings', label: tNav('totalSavings'), icon: Coins },
    { href: '/notifications', label: tNav('notifications'), icon: Bell, badge: unread },
    { href: '/academy', label: tNav('academy'), icon: GraduationCap },
    { href: '/contact', label: tNav('contact'), icon: Mail }
  ]

  const row = (item: Item) => {
    const active = isActive(item.href); const Icon = item.icon
    return (
      <Link key={item.href} href={item.href}
        className={clsx('group flex items-center gap-3 rounded-soft px-3 py-2 text-sm transition-colors',
          active ? 'bg-surface text-text shadow-soft' : 'text-text-soft hover:bg-surface/60')}>
        <Icon className={clsx('h-4 w-4 shrink-0', active ? 'text-accent' : 'text-muted')} strokeWidth={1.7} />
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge ? <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-white text-[11px] font-medium">{item.badge}</span> : null}
      </Link>
    )
  }

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-e border-border bg-bg-soft">
      <div className="px-5 py-5">
        <Link href="/control-center" aria-label="MEC Operations Portal"><BrandLogo size="md" /></Link>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-soft">
        {top.map(row)}
        <div>
          <button type="button" onClick={() => setDeptsOpen(o => !o)}
            className={clsx('w-full flex items-center gap-3 rounded-soft px-3 py-2 text-sm transition-colors',
              isActive('/departments') ? 'text-text' : 'text-text-soft hover:bg-surface/60')}>
            <Network className={clsx('h-4 w-4 shrink-0', isActive('/departments') ? 'text-accent' : 'text-muted')} strokeWidth={1.7} />
            <span className="flex-1 text-start truncate">{tNav('departments')}</span>
            <ChevronDown className={clsx('h-3.5 w-3.5 text-muted transition-transform', deptsOpen && 'rotate-180')} strokeWidth={1.7} />
          </button>
          {deptsOpen && (
            <ul className="mt-1 ms-5 border-s border-border ps-3 space-y-0.5">
              {departmentSeeds.map(d => {
                const href = `/departments/${d.slug}`; const active = isActive(href)
                return (
                  <li key={d.slug}>
                    <Link href={href} className={clsx('block rounded-md px-3 py-1.5 text-sm truncate transition-colors',
                      active ? 'text-accent font-medium' : 'text-text-soft hover:text-text')}>{d.name[locale]}</Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {bottom.map(row)}
      </nav>
      <div className="px-5 py-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />{tCommon('demoBanner')}
        </span>
      </div>
    </aside>
  )
}
