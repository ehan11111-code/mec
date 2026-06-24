'use client'
// Client auth — thin wrappers around /api/auth. The browser never sees passwords or the user list;
// the session is a signed httpOnly cookie set by the server (not readable from JS).
import type { Me } from './auth/users'
export type { Me }

async function post(body: Record<string, unknown>) {
  try {
    const r = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { status: r.status, data: await r.json().catch(() => ({})) }
  } catch { return { status: 0, data: {} as any } }
}

export async function login(username: string, password: string): Promise<{ ok: boolean; user?: Me }> {
  const { data } = await post({ action: 'login', username, password })
  return { ok: !!data.ok, user: data.user }
}
export async function logout(): Promise<void> { await post({ action: 'logout' }) }

export async function getMe(): Promise<Me | null> {
  try { const r = await fetch('/api/auth', { cache: 'no-store' }); const j = await r.json(); return j.user ?? null } catch { return null }
}
export async function changePassword(current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  const { data } = await post({ action: 'password', current, next }); return data
}
export async function resetPassword(): Promise<{ ok: boolean; password?: string; error?: string }> {
  const { data } = await post({ action: 'reset' }); return data
}
export async function uploadAvatar(dataUrl: string): Promise<{ ok: boolean }> {
  const { data } = await post({ action: 'avatar', dataUrl }); return data
}
