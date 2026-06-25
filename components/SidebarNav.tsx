'use client'
import { useState } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { clsx } from 'clsx'
import { LayoutDashboard, Network, GraduationCap, Mail, ChevronDown, Bell, Coins, ShoppingCart, Users, BarChart3, Zap, Radar, MessageCircle, ClipboardCheck, Inbox, Package, ShieldAlert, Activity, Boxes, FileCheck2, Wallet } from 'lucide-react'
import { BrandLogo } from './BrandLogo'
import { departmentSeeds } from '@/lib/mock/catalog'
import { getFirmState } from '@/lib/mock/data'
import { useCurrentUser } from '@/lib/auth/useCurrentUser'
import type { Permission } from '@/lib/auth/users'

type Item = { href: string; label: string; icon: typeof LayoutDashboard; badge?: number; perm: Permission }
type Section = { key: string; items: Item[] }

export function SidebarNav() {
  const pathname = usePathname(); const locale = useLocale() as 'en' | 'ar'
  const tNav = useTranslations('nav'); const tCommon = useTranslations('common')
  const firm = getFirmState()
  const unread = firm.notifications.filter(n => !n.read).length
  const [deptsOpen, setDeptsOpen] = useState(true)
  const { user, can } = useCurrentUser()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const sections: Section[] = [
    { key: 'secOverview', items: [
      { href: '/control-center', label: tNav('controlCenter'), icon: LayoutDashboard, perm: 'dashboard' },
      { href: '/operations', label: tNav('opsHouse'), icon: Activity, perm: 'dashboard' },
      { href: '/inventory', label: tNav('inventory'), icon: Boxes, perm: 'orders' }
    ] },
    { key: 'secSales', items: [
      { href: '/orders', label: tNav('orders'), icon: ShoppingCart, perm: 'orders' },
      { href: '/approvals', label: tNav('approvals'), icon: ClipboardCheck, perm: 'approvals' },
      { href: '/clients', label: tNav('clients'), icon: Users, perm: 'clients' },
      { href: '/products', label: tNav('products'), icon: Package, perm: 'orders' },
      { href: '/credit', label: tNav('credit'), icon: Wallet, perm: 'finance' }
    ] },
    { key: 'secIntel', items: [
      { href: '/analytics', label: tNav('analytics'), icon: BarChart3, perm: 'analytics' },
      { href: '/supply-intelligence', label: tNav('supplyIntel'), icon: Radar, perm: 'supply' },
      { href: '/whatsapp', label: tNav('whatsapp'), icon: MessageCircle, perm: 'whatsapp' },
      { href: '/documents', label: tNav('documents'), icon: FileCheck2, perm: 'documents' }
    ] },
    { key: 'secWorkspace', items: [
      { href: '/messages', label: tNav('messages'), icon: Inbox, perm: 'messages' },
      { href: '/notifications', label: tNav('notifications'), icon: Bell, badge: unread, perm: 'notifications' },
      { href: '/total-savings', label: tNav('totalSavings'), icon: Coins, perm: 'savings' }
    ] },
    { key: 'secAdmin', items: [
      { href: '/automations', label: tNav('automations'), icon: Zap, perm: 'automations' },
      { href: '/admin', label: tNav('adminConsole'), icon: ShieldAlert, perm: 'manageData' }
    ] },
    { key: 'secHelp', items: [
      { href: '/academy', label: tNav('academy'), icon: GraduationCap, perm: 'academy' },
      { href: '/contact', label: tNav('contact'), icon: Mail, perm: 'contact' }
    ] }
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
  const sectionLabel = (k: string) => <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted/70">{tNav(k)}</p>

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-e border-border bg-bg-soft">
      <div className="px-5 py-5">
        <Link href="/control-center" aria-label="MEC Operations Portal"><BrandLogo size="md" /></Link>
      </div>
      <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto scrollbar-soft">
        {!user ? (
          <div className="space-y-2 px-1 pt-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-8 rounded-soft bg-surface/50 animate-pulse" />)}</div>
        ) : (
          <>
            {sections.map(sec => {
              const items = sec.items.filter(it => can(it.perm))
              if (items.length === 0) return null
              return (
                <div key={sec.key}>
                  {sectionLabel(sec.key)}
                  {items.map(row)}
                </div>
              )
            })}
            {can('departments') && (
              <div>
                {sectionLabel('departments')}
                <button type="button" onClick={() => setDeptsOpen(o => !o)}
                  className={clsx('w-full flex items-center gap-3 rounded-soft px-3 py-2 text-sm transition-colors',
                    isActive('/departments') ? 'text-text' : 'text-text-soft hover:bg-surface/60')}>
                  <Network className={clsx('h-4 w-4 shrink-0', isActive('/departments') ? 'text-accent' : 'text-muted')} strokeWidth={1.7} />
                  <span className="flex-1 text-start truncate">{tNav('allDepartments')}</span>
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
            )}
          </>
        )}
      </nav>
      <div className="px-5 py-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-success" />{tCommon('demoBanner')}
        </span>
      </div>
    </aside>
  )
}
