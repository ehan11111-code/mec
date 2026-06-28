import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'
import { analyzeIntake, applyChange, applyChanges, type ReprocessChange } from '@/lib/data/reprocess'
import { reportError } from '@/lib/integrations/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Only these fields may ever be patched by an applied proposal — bounds what a single apply can change.
const ALLOWED = new Set(['intent', 'products', 'order_status', 'client_name', 'order_no', 'decision'])
const sanitize = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p || {}).filter(([k]) => ALLOWED.has(k)))

function authed(req: NextRequest): { ok: boolean; viaKey: boolean } {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (s && permissionsFor(s.r).includes('manageData')) return { ok: true, viaKey: false }
  const secret = process.env.WASENDER_WEBHOOK_SECRET || process.env.STATUS_API_SECRET
  if (secret && req.nextUrl.searchParams.get('key') === secret) return { ok: true, viaKey: true }
  return { ok: false, viaKey: false }
}

// GET → preview proposed changes (missed orders + corrections). Admin only.
export async function GET(req: NextRequest) {
  if (!authed(req).ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  try {
    const { changes, scanned, usedAI } = await analyzeIntake()
    return NextResponse.json({ changes, scanned, usedAI })
  } catch (e) {
    reportError('api/admin/reprocess', e, 'smart reprocess preview').catch(() => {})
    return NextResponse.json({ error: 'analyze_failed', detail: String(e instanceof Error ? e.message : e) }, { status: 502 })
  }
}

// POST → apply changes.
//   { change }            apply one specific proposal (from the Data page; patch is whitelisted)
//   { auto: true } / ?auto=1   re-analyse and auto-apply the high-confidence ones (used by the daily cron)
//   { all: true }         re-analyse and apply every proposal
export async function POST(req: NextRequest) {
  const a = authed(req)
  if (!a.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let body: { change?: ReprocessChange; auto?: boolean; all?: boolean } = {}
  try { body = await req.json() } catch { /* cron may POST empty */ }
  const auto = body.auto || req.nextUrl.searchParams.get('auto') === '1'

  try {
    if (body.change && !auto && !body.all) {
      const ch = { ...body.change, patch: sanitize(body.change.patch) }
      if (!ch.targetId || Object.keys(ch.patch).length === 0) return NextResponse.json({ error: 'invalid_change' }, { status: 400 })
      const ok = await applyChange(ch)
      return ok ? NextResponse.json({ ok: true, applied: 1 }) : NextResponse.json({ error: 'apply_failed' }, { status: 502 })
    }
    // auto / all: re-analyse server-side (never trust a client list for bulk)
    const { changes } = await analyzeIntake()
    const applied = await applyChanges(changes, body.all ? 'all' : 'auto')
    const pending = changes.filter(c => !c.auto && !body.all)
    return NextResponse.json({ ok: true, applied, pending: pending.length, total: changes.length })
  } catch (e) {
    reportError('api/admin/reprocess', e, 'smart reprocess apply').catch(() => {})
    return NextResponse.json({ error: 'apply_failed', detail: String(e instanceof Error ? e.message : e) }, { status: 502 })
  }
}
