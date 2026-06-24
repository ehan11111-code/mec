'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { getMe } from '@/lib/auth'

export default function LocaleIndex() {
  const router = useRouter(); const pathname = usePathname()
  useEffect(() => {
    getMe().then(u => router.replace(u ? '/control-center' : '/login'))
  }, [router, pathname])
  return <div className="min-h-screen flex items-center justify-center bg-bg"><div className="text-sm text-muted animate-pulse">Loading…</div></div>
}
