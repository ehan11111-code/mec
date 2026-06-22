'use client'
import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { getSession } from '@/lib/auth'
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [ready, setReady] = useState(false)
  useEffect(() => { const s = getSession(); if (!s) router.replace('/login'); else setReady(true) }, [router])
  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-bg"><div className="text-sm text-muted animate-pulse">Loading workspace…</div></div>
  return <>{children}</>
}
