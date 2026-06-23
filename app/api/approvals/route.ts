import { NextRequest, NextResponse } from 'next/server'
import { getWhatsappOrders, setOrderStatus } from '@/lib/data/supply'

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
