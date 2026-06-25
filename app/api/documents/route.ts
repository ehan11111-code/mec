import { NextResponse } from 'next/server'
import { getWhatsappIntake, type WhatsappMsg } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

// Documents required to complete an order, after the order itself arrives.
const REQUIRED = ['invoice', 'delivery_note', 'payment'] as const
type DocType = (typeof REQUIRED)[number]

export type DocMessage = {
  message_id: string; doc_type: string; filename: string; body: string
  media_url: string; message_type: string; sender: string; received_at: string
}
export type OrderDocStatus = {
  message_id: string; orderNo: string | null; client: string | null; sender: string; phone: string
  recipient: string | null; units: number; products: WhatsappMsg['products']; received_at: string; body: string
  order_status: string
  received: DocType[]; missing: DocType[]; complete: boolean
  docMsgs: DocMessage[]                       // the actual document messages, so each can be opened/viewed
}

const sumUnits = (ps: WhatsappMsg['products']) => (ps || []).reduce((s, p) => s + (Number(p.qty) || 0), 0)

// Per-order document compliance. The order message is the order; invoice / delivery note / payment proof
// arrive as later DOCUMENT (PDF/photo) messages, matched by order number when both have one, else by the
// same sender after the order's time. A document (intent !== 'order') is never listed as an order.
export async function GET() {
  const msgs = await getWhatsappIntake(300)
  const orders = msgs.filter(m => m.intent === 'order')
  const docs = msgs.filter(m => m.doc_type && (REQUIRED as readonly string[]).includes(m.doc_type))
  const rows: OrderDocStatus[] = orders.map(o => {
    const matched = docs.filter(d => {
      if (o.order_no && d.order_no) return d.order_no === o.order_no
      return d.phone === o.phone && d.received_at >= o.received_at
    })
    const received = [...new Set(matched.map(d => d.doc_type as DocType))]
    const missing = REQUIRED.filter(r => !received.includes(r))
    const dn = matched.find(d => d.doc_type === 'delivery_note')
    const docMsgs: DocMessage[] = matched.map(d => ({
      message_id: d.message_id, doc_type: d.doc_type as string, filename: d.body || '', body: d.body || '',
      media_url: (d as any).media_url || '', message_type: d.message_type, sender: d.salesperson || d.push_name || d.phone, received_at: d.received_at
    }))
    return {
      message_id: o.message_id, orderNo: o.order_no || null, client: o.client_name || null,
      sender: o.salesperson || o.push_name || o.phone, phone: o.phone,
      recipient: o.recipient || dn?.recipient || null, units: sumUnits(o.products), products: o.products || [],
      received_at: o.received_at, body: o.body || '', order_status: o.order_status || 'pending',
      received, missing, complete: missing.length === 0, docMsgs
    }
  })
  rows.sort((a, b) => b.received_at.localeCompare(a.received_at))
  return NextResponse.json(rows)
}
