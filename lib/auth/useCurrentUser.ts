'use client'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { permissionsFor, type User, type Permission } from './users'

// Client hook: returns the logged-in user + a permission checker. Hydration-safe (null on first paint).
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    setUser(getCurrentUser())
    const onStorage = () => setUser(getCurrentUser())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  const perms: Permission[] = user ? permissionsFor(user.role) : []
  const can = (p: Permission) => perms.includes(p)
  return { user, perms, can }
}
