import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'
import { reconcile, confirmAdjustment } from '@/lib/data/reconcile-credit'
import { reportError } from '@/lib/integrations/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Reconciliation is a finance action — finance or admin/CEO (manageData) may view and confirm.
function authed(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s) return null
  const perms = permissionsFor(s.r)
  return (perms.includes('finance') || perms.includes('manageData')) ? s : null
}

// GET → the reconciliation: statement total, confirmed adjustments, effective line, and pending proposals.
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  try {
    return NextResponse.json(await reconcile())
  } catch (e) {
    reportError('api/credit/reconcile', e, 'reconcile preview').catch(() => {})
    return NextResponse.json({ error: 'reconcile_failed' }, { status: 502 })
  }
}

// POST → confirm a proposed payment (writes a credit_adjustments row). Body: { message_id, client, amount, note }.
export async function POST(req: NextRequest) {
  const s = authed(req)
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let body: { message_id?: string; client?: string | null; amount?: number; note?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  if (!body.message_id || !body.amount || body.amount <= 0) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  try {
    const ok = await confirmAdjustment({ client: body.client ?? null, amount: body.amount, source_message_id: body.message_id, note: body.note, confirmed_by: s.u })
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'apply_failed' }, { status: 502 })
  } catch (e) {
    reportError('api/credit/reconcile', e, 'reconcile confirm').catch(() => {})
    return NextResponse.json({ error: 'apply_failed' }, { status: 502 })
  }
}
