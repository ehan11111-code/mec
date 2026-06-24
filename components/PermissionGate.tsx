'use client'
import { useLocale, useTranslations } from 'next-intl'
import { Lock } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useCurrentUser } from '@/lib/auth/useCurrentUser'
import type { Permission } from '@/lib/auth/users'

// Blocks the page body when the signed-in role lacks the permission (defends direct-URL access; the
// sidebar already hides the link). Renders nothing until the user hydrates to avoid a flash.
export function PermissionGate({ requires, children }: { requires: Permission; children: React.ReactNode }) {
  const { user, can } = useCurrentUser()
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('common')
  if (!user) return null
  if (can(requires)) return <>{children}</>
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-24 px-6">
      <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-bg-soft text-muted"><Lock className="h-6 w-6" strokeWidth={1.6} /></span>
      <p className="text-base font-semibold text-text">{t('noAccessTitle')}</p>
      <p className="text-sm text-muted max-w-sm">{t('noAccessBody')}</p>
      <Link href="/control-center" className="mt-1 rounded-full bg-accent text-white text-sm font-medium px-4 py-2 hover:bg-accent-strong transition-colors">{t('backToDash')}</Link>
    </div>
  )
}
