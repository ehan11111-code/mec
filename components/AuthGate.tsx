'use client'
import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { getMe } from '@/lib/auth'
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [ready, setReady] = useState(false)
  useEffect(() => { getMe().then(u => { if (!u) router.replace('/login'); else setReady(true) }) }, [router])
  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-bg"><div className="text-sm text-muted animate-pulse">Loading workspace…</div></div>
  return <>{children}</>
}
