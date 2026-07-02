import { NextRequest, NextResponse } from 'next/server'
import { getWhatsappIntake, setOrderStatus, deleteWhatsapp } from '@/lib/data/supply'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'

export const dynamic = 'force-dynamic'

// GET → all WhatsApp orders (newest first), each enriched with WHEN + HOW it was decided and how long that
// took: decidedAt (the approving/rejecting reply or ✅/👍 reaction's time), minutesToDecision, decisionVia.
export async function GET() {
  const msgs = await getWhatsappIntake(300)
  const orders = msgs.filter(m => m.intent === 'order')
  const decByOrder = new Map<string, { at: string; via: string; kind: string }>()
  for (const d of msgs.filter(m => m.decision && m.quoted_message_id).sort((a, b) => (a.received_at < b.received_at ? -1 : 1))) {
    decByOrder.set(d.quoted_message_id as string, { at: d.received_at, via: d.message_type === 'reaction' ? 'reaction' : 'reply', kind: d.decision as string })
  }
  const enriched = orders.map(o => {
    const d = decByOrder.get(o.message_id)
    const decidedAt = d ? d.at : null
    const minutesToDecision = decidedAt ? Math.max(0, Math.round((Date.parse(decidedAt) - Date.parse(o.received_at)) / 60000)) : null
    return { ...o, decidedAt, minutesToDecision, decisionVia: d?.via || null, decisionKind: d?.kind || null }
  })
  enriched.sort((a, b) => (a.received_at < b.received_at ? 1 : -1))
  return NextResponse.json(enriched)
}

// POST { message_id, decision: 'approved' | 'rejected' } → set the order's approval status.
export async function POST(req: NextRequest) {
  let body: { message_id?: string; decision?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const id = body.message_id
  const decision = body.decision
  if (!id || (decision !== 'approved' && decision !== 'rejected')) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const ok = await setOrderStatus(id, decision)
  return ok ? NextResponse.json({ ok: true, message_id: id, decision }) : NextResponse.json({ error: 'update_failed' }, { status: 502 })
}

// DELETE { message_id } → permanently remove an order (jarvis/admin only — needs `manageData`).
// The same delete clears it from approvals, documents, the orders feed, the inbox and notifications,
// since they all read the live `whatsapp_intake` table.
export async function DELETE(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !permissionsFor(s.r).includes('manageData')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  let body: { message_id?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  if (!body.message_id) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const ok = await deleteWhatsapp(body.message_id)
  return ok ? NextResponse.json({ ok: true, message_id: body.message_id, deleted: true }) : NextResponse.json({ error: 'delete_failed' }, { status: 502 })
}
