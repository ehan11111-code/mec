import { NextResponse } from 'next/server'
import { getWhatsappIntake, type WhatsappMsg } from '@/lib/data/supply'
import { nameSimilar, productsOverlap } from '@/lib/data/core/match'

export const dynamic = 'force-dynamic'

// Documents required to complete an order, after the order itself arrives.
const REQUIRED = ['invoice', 'delivery_note', 'payment'] as const
type DocType = (typeof REQUIRED)[number]

// How a document was tied to its order — most-trustworthy first.
//   order_no        the document carries the order's number (exact)
//   client_product  a preceding order shares the document's client or a product (validated)
//   time_only       the document has no client/products of its own, matched to the nearest prior order
//   conflict        the document HAS its own client/products but none of the orders match → flagged
type LinkKind = 'order_no' | 'client_product' | 'time_only' | 'conflict'

export type DocMessage = {
  message_id: string; doc_type: string; filename: string; body: string
  media_url: string; message_type: string; sender: string; received_at: string
  minutesAfterOrder: number | null   // how long after the order this document arrived
  client: string | null              // the document's OWN client (never the order's — this is the bug fix)
  products: WhatsappMsg['products']  // the document's OWN products
  link: LinkKind                     // how confidently it was matched to this order
  mismatch: boolean                  // the document's own client/products contradict the linked order
}
export type OrderDocStatus = {
  message_id: string; orderNo: string | null; client: string | null; sender: string; phone: string
  recipient: string | null; units: number; products: WhatsappMsg['products']; received_at: string; body: string
  order_status: string
  received: DocType[]; missing: DocType[]; complete: boolean
  mismatchCount: number              // documents attached to this order that don't match it
  docMsgs: DocMessage[]
}

const sumUnits = (ps: WhatsappMsg['products']) => (ps || []).reduce((s, p) => s + (Number(p.qty) || 0), 0)
const sameGroup = (a: WhatsappMsg, b: WhatsappMsg) => !!(a.group_jid && b.group_jid && a.group_jid === b.group_jid)
const hasOwnIdentity = (d: WhatsappMsg) => !!(d.client_name || (d.products && d.products.length))
// A document matches an order when they share the client OR at least one product.
const docMatchesOrder = (d: WhatsappMsg, o: WhatsappMsg) =>
  nameSimilar(d.client_name, o.client_name) || productsOverlap(d.products, o.products)

// Decide which order a document belongs to, and how sure we are.
function linkDocument(d: WhatsappMsg, orders: WhatsappMsg[]): { order?: WhatsappMsg; link: LinkKind; mismatch: boolean } {
  // 1) explicit order number wins.
  if (d.order_no) {
    const o = orders.find(x => x.order_no && x.order_no === d.order_no)
    if (o) return { order: o, link: 'order_no', mismatch: hasOwnIdentity(d) && !docMatchesOrder(d, o) }
  }
  const before = orders.filter(o => o.received_at <= d.received_at)
  const grouped = before.filter(o => sameGroup(o, d))
  const pool = grouped.length ? grouped : before
  if (!pool.length) return { link: hasOwnIdentity(d) ? 'conflict' : 'time_only', mismatch: hasOwnIdentity(d) }

  if (hasOwnIdentity(d)) {
    // 2) prefer the most recent PRECEDING order that actually shares the client or a product.
    for (let i = pool.length - 1; i >= 0; i--) if (docMatchesOrder(d, pool[i])) return { order: pool[i], link: 'client_product', mismatch: false }
    // 3) the document names a client/products but nothing matches → attach to nearest for context, flag it.
    return { order: pool[pool.length - 1], link: 'conflict', mismatch: true }
  }
  // 4) a bare file with no client/products of its own — matched to the nearest prior order by time only.
  return { order: pool[pool.length - 1], link: 'time_only', mismatch: false }
}

// Per-order document compliance. Each document keeps its OWN client/products (previously it was shown with
// the order's, which is why invoices/delivery-notes appeared to have the wrong client/items). A document
// only counts toward "received/complete" when it is confidently matched (order number, or a shared
// client/product); a document that names a different client/products is attached but flagged as a mismatch
// so the wrong data is visible, not hidden.
export async function GET() {
  const msgs = await getWhatsappIntake(300)
  const orders = msgs.filter(m => m.intent === 'order').sort((a, b) => (a.received_at < b.received_at ? -1 : 1)) // oldest → newest
  const docs = msgs.filter(m => m.doc_type && (REQUIRED as readonly string[]).includes(m.doc_type))

  const assigned = new Map<string, { d: WhatsappMsg; link: LinkKind; mismatch: boolean }[]>()
  for (const d of docs) {
    const { order, link, mismatch } = linkDocument(d, orders)
    if (!order) continue
    const a = assigned.get(order.message_id) || []
    a.push({ d, link, mismatch }); assigned.set(order.message_id, a)
  }

  const rows: OrderDocStatus[] = orders.map(o => {
    const matched = assigned.get(o.message_id) || []
    // Only confidently-matched, non-conflicting documents satisfy a requirement.
    const counts = matched.filter(m => !m.mismatch && m.link !== 'conflict')
    const received = [...new Set(counts.map(m => m.d.doc_type as DocType))]
    const missing = REQUIRED.filter(r => !received.includes(r))
    const dn = matched.find(m => m.d.doc_type === 'delivery_note')?.d
    const docMsgs: DocMessage[] = matched.map(({ d, link, mismatch }) => ({
      message_id: d.message_id, doc_type: d.doc_type as string, filename: d.body || '', body: d.body || '',
      media_url: (d as any).media_url || '', message_type: d.message_type,
      sender: d.salesperson || d.push_name || d.phone, received_at: d.received_at,
      minutesAfterOrder: Math.max(0, Math.round((Date.parse(d.received_at) - Date.parse(o.received_at)) / 60000)),
      client: d.client_name || null, products: d.products || [], link, mismatch
    }))
    return {
      message_id: o.message_id, orderNo: o.order_no || null, client: o.client_name || null,
      sender: o.salesperson || o.push_name || o.phone, phone: o.phone,
      recipient: o.recipient || dn?.recipient || null, units: sumUnits(o.products), products: o.products || [],
      received_at: o.received_at, body: o.body || '', order_status: o.order_status || 'pending',
      received, missing, complete: missing.length === 0,
      mismatchCount: docMsgs.filter(m => m.mismatch).length, docMsgs
    }
  })
  rows.sort((a, b) => b.received_at.localeCompare(a.received_at))
  return NextResponse.json(rows)
}
