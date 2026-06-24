'use client'
import { useCallback, useEffect, useState } from 'react'
import { getMe } from '@/lib/auth'
import type { Me, Permission } from './users'

// Client hook: returns the logged-in user (from the signed cookie via /api/auth) + a permission check.
// Null until the first fetch resolves.
export function useCurrentUser() {
  const [user, setUser] = useState<Me | null>(null)
  const [loaded, setLoaded] = useState(false)
  const refresh = useCallback(() => { getMe().then(u => { setUser(u); setLoaded(true) }) }, [])
  useEffect(() => { refresh() }, [refresh])
  const can = (p: Permission) => !!user?.permissions.includes(p)
  return { user, loaded, can, refresh }
}
