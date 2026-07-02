import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { findUser, permissionsFor } from '@/lib/auth/users'
import { getProductList } from '@/lib/data/dataset'
import { evaluateOrder, type LineInput } from '@/lib/o2c/margin'
import { insertWhatsapp } from '@/lib/data/supply'
import { getTargetMargins } from '@/lib/data/margins-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LineReq = { item: string; sell: number; qty: number }

// POST → create a portal (O2C) order. The server re-evaluates the margin gate from the LIVE product data
// (authoritative cost + on-hand — the client is never trusted), then:
//   • all lines auto → order_status 'approved' (auto-approved, margin-gated)
//   • otherwise      → order_status 'pending'  (human-approval queue)
// A warn (below target / stock unconfirmed) needs the salesman's explicit confirm first (409 needsConfirm).
// The order is filed into whatsapp_intake so it appears in Approvals / Orders / Documents like any order.
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s || !permissionsFor(s.r).includes('orders')) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body: { clientName?: string; lines?: LineReq[]; confirmBelowTarget?: boolean }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const clientName = (body.clientName || '').trim()
  const reqLines = (body.lines || []).filter(l => l && l.item && Number(l.sell) > 0 && Number(l.qty) > 0)
  if (!clientName || reqLines.length === 0) return NextResponse.json({ error: 'invalid', detail: 'client and at least one line required' }, { status: 400 })

  // Authoritative lookup against live product data — cost + on-hand come from the server, not the client.
  const byItem = new Map(getProductList().map(p => [p.item, p]))
  const inputs: LineInput[] = reqLines.map(l => {
    const p = byItem.get(l.item)
    return { item: l.item, category: p?.category || 'Beef', sell: Number(l.sell), qty: Number(l.qty), cost: p?.unitCost ?? null, onHand: p?.onHand ?? null, confidence: p?.confidence ?? 'none' }
  })
  const overrides = await getTargetMargins()          // per-product target margins set by finance/commercial
  const evaluation = evaluateOrder(inputs, overrides)

  // Below-target lines (warn) queue only after the salesman confirms. Blocks/reviews always queue.
  if (evaluation.anyWarn && !evaluation.anyBlock && !evaluation.anyReview && !body.confirmBelowTarget) {
    return NextResponse.json({ needsConfirm: true, evaluation }, { status: 409 })
  }

  const salesperson = findUser(s.u)?.name.ar || s.u   // whatsapp_intake stores the Arabic salesperson name
  const autoApproved = evaluation.decision === 'auto_approve'
  const status = autoApproved ? 'approved' : 'pending'
  const message_id = `portal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const products = inputs.map(l => ({ name: l.item, qty: l.qty, unit: 'كرتون' }))
  const summary = `طلب من البوابة · ${clientName} · ${products.map(p => `${p.name}×${p.qty}`).join('، ')} · ${autoApproved ? 'موافق تلقائيًا (ضمن الهامش)' : 'بانتظار الاعتماد'}`

  const ok = await insertWhatsapp({
    message_id, intent: 'order', message_type: 'text', group_type: 'portal',
    phone: '', push_name: salesperson, salesperson,
    client_name: clientName, products, order_status: status,
    body: summary, verified: true, received_at: new Date().toISOString(),
    raw: { source: 'portal_o2c', created_by: s.u, margin: evaluation }
  })
  if (!ok) return NextResponse.json({ error: 'save_failed', detail: 'order evaluated but not saved (is Supabase configured?)', evaluation }, { status: 502 })

  return NextResponse.json({ ok: true, orderId: message_id, decision: evaluation.decision, autoApproved, status, evaluation })
}
