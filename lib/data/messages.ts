// Server-side reads/writes for internal staff messaging (JARVIS inbox). Uses the Supabase service-role
// key — NEVER import into a client component. Falls back to [] when env/tables are absent.

export type InternalMessage = {
  id: number; from_user: string; to_user: string; body: string; read: boolean; created_at: string
}

function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}
export const messagingConfigured = () => !!cfg()

async function rest<T>(path: string, init?: RequestInit): Promise<T[]> {
  const c = cfg(); if (!c) return []
  try {
    const r = await fetch(`${c.url}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', ...(init?.headers || {}) },
      cache: 'no-store'
    })
    if (!r.ok) return []
    const txt = await r.text(); if (!txt) return []
    const j = JSON.parse(txt)
    return Array.isArray(j) ? j : []
  } catch { return [] }
}

// All messages involving `user` (inbox + sent), newest last for thread rendering.
export function getMessagesFor(user: string, limit = 500): Promise<InternalMessage[]> {
  const u = encodeURIComponent(user)
  return rest<InternalMessage>(`internal_messages?or=(from_user.eq.${u},to_user.eq.${u})&order=created_at.asc&limit=${limit}`)
}

export async function sendMessage(from_user: string, to_user: string, body: string): Promise<InternalMessage | null> {
  const c = cfg(); if (!c) return null
  const rows = await rest<InternalMessage>('internal_messages', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ from_user, to_user, body })
  })
  return rows[0] ?? null
}

// Mark messages from `other` → `user` as read.
export async function markRead(user: string, other: string): Promise<boolean> {
  const c = cfg(); if (!c) return false
  try {
    const r = await fetch(`${c.url}/rest/v1/internal_messages?to_user=eq.${encodeURIComponent(user)}&from_user=eq.${encodeURIComponent(other)}&read=eq.false`, {
      method: 'PATCH',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ read: true }), cache: 'no-store'
    })
    return r.ok
  } catch { return false }
}
