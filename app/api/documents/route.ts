import { NextResponse } from 'next/server'
import { getWhatsappIntake, type WhatsappMsg } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

// Documents required to complete an order, after the order/PO itself arrives.
const REQUIRED = ['invoice', 'delivery_note', 'payment'] as const
type DocType = (typeof REQUIRED)[number]

export type OrderDocStatus = {
  message_id: string; sender: string; phone: string; received_at: string
  order_status: string; products: WhatsappMsg['products']
  received: DocType[]; missing: DocType[]; complete: boolean
}

// Build per-order document compliance from the WhatsApp intake. The order message itself is the PO;
// invoice / delivery note / payment proof arrive as later document messages from the same sender.
export async function GET() {
  const msgs = await getWhatsappIntake(300)
  const orders = msgs.filter(m => m.intent === 'order')
  const docs = msgs.filter(m => m.doc_type && (REQUIRED as readonly string[]).includes(m.doc_type))
  const rows: OrderDocStatus[] = orders.map(o => {
    const received = [...new Set(docs
      .filter(d => d.phone === o.phone && d.received_at >= o.received_at)
      .map(d => d.doc_type as DocType))]
    const missing = REQUIRED.filter(r => !received.includes(r))
    return {
      message_id: o.message_id, sender: o.push_name || o.phone, phone: o.phone, received_at: o.received_at,
      order_status: o.order_status || 'pending', products: o.products || [],
      received, missing, complete: missing.length === 0
    }
  })
  rows.sort((a, b) => b.received_at.localeCompare(a.received_at))
  return NextResponse.json(rows)
}
