import { NextResponse } from 'next/server'
import { getWhatsappIntake, type WhatsappMsg } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

// Documents required to complete an order, after the order/PO itself arrives.
const REQUIRED = ['invoice', 'delivery_note', 'payment'] as const
type DocType = (typeof REQUIRED)[number]

export type OrderDocStatus = {
  message_id: string; orderNo: string | null; client: string | null; sender: string; phone: string
  recipient: string | null; units: number; products: WhatsappMsg['products']; received_at: string
  order_status: string
  received: DocType[]; missing: DocType[]; complete: boolean
}

const sumUnits = (ps: WhatsappMsg['products']) => (ps || []).reduce((s, p) => s + (Number(p.qty) || 0), 0)

// Build per-order document compliance from the WhatsApp intake. The order message itself is the order;
// invoice / delivery note / payment proof arrive as later document messages. They are matched to the
// order by ORDER NUMBER when both have one, otherwise by the same sender after the order's time.
// A document (intent !== 'order') is never itself listed as an order — so an invoice never becomes a
// second order row.
export async function GET() {
  const msgs = await getWhatsappIntake(300)
  const orders = msgs.filter(m => m.intent === 'order')
  const docs = msgs.filter(m => m.doc_type && (REQUIRED as readonly string[]).includes(m.doc_type))
  const rows: OrderDocStatus[] = orders.map(o => {
    const matched = docs.filter(d => {
      if (o.order_no && d.order_no) return d.order_no === o.order_no          // strongest: same order/invoice number
      return d.phone === o.phone && d.received_at >= o.received_at            // fallback: same sender, later
    })
    const received = [...new Set(matched.map(d => d.doc_type as DocType))]
    const missing = REQUIRED.filter(r => !received.includes(r))
    // a recipient/driver may be named on the order itself or on its delivery note
    const dn = matched.find(d => d.doc_type === 'delivery_note')
    return {
      message_id: o.message_id, orderNo: o.order_no || null, client: o.client_name || null,
      sender: o.salesperson || o.push_name || o.phone, phone: o.phone,
      recipient: o.recipient || dn?.recipient || null, units: sumUnits(o.products), products: o.products || [],
      received_at: o.received_at, order_status: o.order_status || 'pending',
      received, missing, complete: missing.length === 0
    }
  })
  rows.sort((a, b) => b.received_at.localeCompare(a.received_at))
  return NextResponse.json(rows)
}
