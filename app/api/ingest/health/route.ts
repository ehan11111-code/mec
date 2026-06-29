import { NextRequest, NextResponse } from 'next/server'
import { sendWhatsApp, JARVIS_TEAM } from '@/lib/integrations/notify'
import { getWhatsappIntake } from '@/lib/data/supply'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The WhatsApp Intake workflow — the one whose deactivation killed the "hi jarvis" chain before. Watchdog
// keeps it alive: if n8n shows it inactive, reactivate it and WhatsApp the owner.
const INTAKE_WF = process.env.N8N_INTAKE_WORKFLOW_ID || 'NzuuId3FYrcqaAkb'

async function timed<T>(p: Promise<T>, ms = 6000): Promise<T | null> {
  return Promise.race([p, new Promise<null>(res => setTimeout(() => res(null), ms))])
}

async function n8n(path: string, init?: RequestInit) {
  const base = (process.env.N8N_API_BASE_URL || '').replace(/\/+$/, ''); const key = process.env.N8N_API_KEY
  if (!base || !key) return null
  try { return await timed(fetch(`${base}/api/v1/${path}`, { ...init, headers: { 'X-N8N-API-KEY': key, 'Content-Type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store' })) } catch { return null }
}

// GET /api/ingest/health[?key=<secret>][&heal=1]
// Reports intake/worker health. With heal=1 (and a valid key or admin session — here gated by the shared
// secret so a cron can call it), reactivates the intake workflow if it's off and alerts the owner.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const secret = process.env.WASENDER_WEBHOOK_SECRET || process.env.STATUS_API_SECRET
  const keyed = secret && sp.get('key') === secret
  const heal = sp.get('heal') === '1' && keyed

  // 1. Intake workflow active?
  let intakeActive: boolean | null = null
  const wfr = await n8n(`workflows/${INTAKE_WF}`)
  if (wfr && wfr.ok) { try { intakeActive = !!(await wfr.json()).active } catch { intakeActive = null } }

  let healed = false
  if (heal && intakeActive === false) {
    const act = await n8n(`workflows/${INTAKE_WF}/activate`, { method: 'POST' })
    healed = !!(act && act.ok)
    if (healed) {
      const msg = '🤖 JARVIS watchdog: the WhatsApp Intake workflow was OFF — I reactivated it. Inbound messages/PDFs are flowing again.'
      await Promise.all(JARVIS_TEAM.slice(0, 1).map(t => sendWhatsApp(t.phone, msg))).catch(() => {})
      intakeActive = true
    }
  }

  // 2. Freshness — when did the last message arrive?
  let lastMessageAt: string | null = null, hoursSince: number | null = null
  try {
    const live = await getWhatsappIntake(1)
    lastMessageAt = live[0]?.received_at || null
    if (lastMessageAt) hoursSince = Math.round((Date.now() - new Date(lastMessageAt).getTime()) / 36e5 * 10) / 10
  } catch {}

  // 3. Worker heartbeat(s)
  let workers: { id: string; beat_at: string; processed: number; failed: number; stale: boolean }[] = []
  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''); const sk = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && sk) {
      const r = await timed(fetch(`${url}/rest/v1/worker_health?select=*`, { headers: { apikey: sk, Authorization: `Bearer ${sk}` }, cache: 'no-store' }))
      if (r && r.ok) {
        const rows = await r.json()
        workers = (Array.isArray(rows) ? rows : []).map((w: any) => ({ id: w.id, beat_at: w.beat_at, processed: w.processed ?? 0, failed: w.failed ?? 0, stale: w.beat_at ? (Date.now() - new Date(w.beat_at).getTime()) > 15 * 60_000 : true }))
      }
    }
  } catch {}

  const ok = intakeActive !== false
  return NextResponse.json({ ok, intakeActive, healed, lastMessageAt, hoursSinceLastMessage: hoursSince, workers, checkedAt: new Date().toISOString() })
}
