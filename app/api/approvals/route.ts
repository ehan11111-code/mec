import { NextRequest, NextResponse } from 'next/server'
import { getWhatsappOrders, setOrderStatus, deleteWhatsapp } from '@/lib/data/supply'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'

export const dynamic = 'force-dynamic'

// GET → all WhatsApp messages classified as orders (newest first).
export async function GET() {
  const orders = await getWhatsappOrders(100)
  return NextResponse.json(orders)
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
