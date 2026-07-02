import { NextResponse } from 'next/server'
import { getWhatsappIntake, type WhatsappMsg } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

// Documents required to complete an order, after the order itself arrives.
const REQUIRED = ['invoice', 'delivery_note', 'payment'] as const
type DocType = (typeof REQUIRED)[number]

export type DocMessage = {
  message_id: string; doc_type: string; filename: string; body: string
  media_url: string; message_type: string; sender: string; received_at: string
  minutesAfterOrder: number | null   // how long after the order this document arrived
}
export type OrderDocStatus = {
  message_id: string; orderNo: string | null; client: string | null; sender: string; phone: string
  recipient: string | null; units: number; products: WhatsappMsg['products']; received_at: string; body: string
  order_status: string
  received: DocType[]; missing: DocType[]; complete: boolean
  docMsgs: DocMessage[]
}

const sumUnits = (ps: WhatsappMsg['products']) => (ps || []).reduce((s, p) => s + (Number(p.qty) || 0), 0)

// Per-order document compliance. Documents (invoice / delivery note / payment) can be sent by ANYONE in
// the group — not only the salesperson who placed the order. Each document is attached to its order by
// ORDER NUMBER when available, otherwise to the most recent order at/before its time (preferring the same
// group). A document (intent !== 'order') is never itself listed as an order.
export async function GET() {
  const msgs = await getWhatsappIntake(300)
  const orders = msgs.filter(m => m.intent === 'order').sort((a, b) => (a.received_at < b.received_at ? -1 : 1)) // oldest → newest
  const docs = msgs.filter(m => m.doc_type && (REQUIRED as readonly string[]).includes(m.doc_type))

  // Assign each document to exactly one order (by number, else the latest preceding order — any sender).
  const assigned = new Map<string, WhatsappMsg[]>()
  for (const d of docs) {
    let target: WhatsappMsg | undefined
    if (d.order_no) target = orders.find(o => o.order_no && o.order_no === d.order_no)
    if (!target) {
      const before = orders.filter(o => o.received_at <= d.received_at)
      const sameGroup = before.filter(o => o.group_jid && d.group_jid && o.group_jid === d.group_jid)
      const pool = sameGroup.length ? sameGroup : before
      target = pool[pool.length - 1]                 // most recent order at/before the document
    }
    if (target) {
      const a = assigned.get(target.message_id) || []
      a.push(d); assigned.set(target.message_id, a)
    }
  }

  const rows: OrderDocStatus[] = orders.map(o => {
    const matched = assigned.get(o.message_id) || []
    const received = [...new Set(matched.map(d => d.doc_type as DocType))]
    const missing = REQUIRED.filter(r => !received.includes(r))
    const dn = matched.find(d => d.doc_type === 'delivery_note')
    const docMsgs: DocMessage[] = matched.map(d => ({
      message_id: d.message_id, doc_type: d.doc_type as string, filename: d.body || '', body: d.body || '',
      media_url: (d as any).media_url || '', message_type: d.message_type, sender: d.salesperson || d.push_name || d.phone, received_at: d.received_at,
      minutesAfterOrder: Math.max(0, Math.round((Date.parse(d.received_at) - Date.parse(o.received_at)) / 60000))
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
