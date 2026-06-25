// Server-only error reporting → WhatsApp alert to the team + Supabase audit (best effort).
// Call reportError(source, error, context?) from any server route's catch block, or POST /api/report-error.
import { sendWhatsApp, JARVIS_TEAM } from './notify'

// Throttle identical alerts so a flapping error can't spam WhatsApp (key → last-sent ms).
const lastSent = new Map<string, number>()
const THROTTLE_MS = 10 * 60 * 1000

function cfg() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url, key } : null
}

export async function reportError(source: string, error: unknown, context?: string): Promise<void> {
  const message = error instanceof Error ? (error.stack || error.message) : String(error)
  const key = `${source}:${message}`.slice(0, 200)
  const now = Date.now()
  const recent = lastSent.get(key)
  const throttled = recent != null && now - recent < THROTTLE_MS
  if (!throttled) lastSent.set(key, now)

  // 1) audit to Supabase error_log (best effort — never throws)
  const c = cfg()
  if (c) {
    try {
      await fetch(`${c.url}/rest/v1/error_log`, {
        method: 'POST',
        headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ source, message: message.slice(0, 2000), context: context || null }), cache: 'no-store'
      })
    } catch { /* table may not exist yet — ignore */ }
  }

  // 2) WhatsApp the team (unless throttled)
  if (throttled) return
  const text = [
    `🔴 *MEC Portal — error*`,
    `Source: ${source}`,
    context ? `Where: ${context}` : '',
    ``,
    message.slice(0, 600),
    ``,
    `${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`,
    `_JARVIS auto-alert. Reply "report" for full status._`,
  ].filter(Boolean).join('\n')
  try { await Promise.all(JARVIS_TEAM.map(t => sendWhatsApp(t.phone, text))) } catch { /* ignore */ }
}
