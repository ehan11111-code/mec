'use client'
import { USERS, findUser, permissionsFor, type User, type Permission } from './auth/users'

const KEY = 'portal_session'
const PW_KEY = 'portal_pw'        // { [username]: newPassword }
const AV_KEY = 'portal_avatar'    // { [username]: dataUrl }

export type Session = { username: string; ts: number }

// ── session ──
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY); if (!raw) return null
    const s = JSON.parse(raw) as Partial<Session> & { email?: string }
    // migrate the old { email } session shape
    const username = s.username || s.email || ''
    return username ? { username, ts: s.ts ?? Date.now() } : null
  } catch { return null }
}
export function setSession(username: string) { if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify({ username, ts: Date.now() })) }
export function clearSession() { if (typeof window !== 'undefined') localStorage.removeItem(KEY) }

// ── password overrides (demo: stored client-side) ──
function readMap(key: string): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}
function writeMap(key: string, m: Record<string, string>) { if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(m)) }

export function effectivePassword(u: User): string { return readMap(PW_KEY)[u.username] ?? u.password }
export function setPassword(username: string, pw: string) { const m = readMap(PW_KEY); m[username] = pw; writeMap(PW_KEY, m) }

// Generate a fresh memorable-but-random password (used by "forgot password").
const WORDS = ['Falcon', 'Cedar', 'Harbor', 'Summit', 'Vertex', 'Orbit', 'Delta', 'Atlas', 'Nova', 'Pearl', 'Saffron', 'Cobalt']
export function generatePassword(): string {
  const w = WORDS[Math.floor(Math.random() * WORDS.length)]
  const n = String(1000 + Math.floor(Math.random() * 9000))
  return `${w}-${n}`
}

// ── avatars (base64 data URL in localStorage) ──
export function getAvatar(username: string): string | null { return readMap(AV_KEY)[username] ?? null }
export function setAvatar(username: string, dataUrl: string) { const m = readMap(AV_KEY); m[username] = dataUrl; writeMap(AV_KEY, m) }

// ── auth ──
export function authenticate(username: string, password: string): User | null {
  const u = findUser(username)
  if (!u) return null
  return effectivePassword(u) === password ? u : null
}
export function getCurrentUser(): User | null {
  const s = getSession(); if (!s) return null
  return findUser(s.username) ?? null
}
export function currentPermissions(): Permission[] {
  const u = getCurrentUser(); return u ? permissionsFor(u.role) : []
}
export function can(perm: Permission): boolean { return currentPermissions().includes(perm) }

export { USERS, type User, type Permission }
