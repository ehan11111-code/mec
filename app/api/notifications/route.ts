import { NextResponse } from 'next/server'
import { getSupplyIntel, getWhatsappOrders, getWhatsappIntake } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

type Bi = { en: string; ar: string }
type Note = { id: string; type: 'urgent' | 'attention' | 'update' | 'info' | 'approval'; title: Bi; deptName: Bi; ts: string; read: boolean; link: string }

const DEPT: Bi = { en: 'Supply intelligence', ar: 'استخبارات التوريد' }
const ORDERS: Bi = { en: 'Order approvals', ar: 'اعتماد الطلبات' }
const DOCS: Bi = { en: 'Documents', ar: 'المستندات' }
const REQ = ['invoice', 'delivery_note', 'payment']

// Derive live notifications from the supply-intelligence feed + pending WhatsApp orders + missing docs.
export async function GET() {
  const [rows, orders, intake] = await Promise.all([getSupplyIntel(), getWhatsappOrders(50), getWhatsappIntake(300)])
  const notes: Note[] = []

  // Missing-document alerts: an order's PO is in, but a required document hasn't arrived yet.
  const docMsgs = intake.filter(m => m.doc_type && REQ.includes(m.doc_type))
  for (const o of intake.filter(m => m.intent === 'order')) {
    const received = new Set(docMsgs.filter(d => d.phone === o.phone && d.received_at >= o.received_at).map(d => d.doc_type))
    const missing = REQ.filter(r => !received.has(r as any))
    if (missing.includes('invoice')) {
      notes.push({
        id: `doc-${o.message_id}`, type: 'attention',
        title: { en: `Missing invoice — order from ${o.push_name || o.phone}`, ar: `فاتورة ناقصة — طلب من ${o.push_name || o.phone}` },
        deptName: DOCS, ts: o.received_at, read: false, link: '/documents'
      })
    }
  }
  for (const o of orders) {
    if ((o.order_status || 'pending') !== 'pending') continue
    const items = (o.products || []).map(p => `${p.name}${p.qty ? ` ×${p.qty}` : ''}`).join(', ')
    notes.push({
      id: `wa-order-${o.message_id}`,
      type: 'approval',
      title: { en: `New order to approve — ${o.push_name || o.phone}${items ? `: ${items}` : ''}`, ar: `طلب جديد للاعتماد — ${o.push_name || o.phone}${items ? `: ${items}` : ''}` },
      deptName: ORDERS, ts: o.received_at, read: false, link: '/approvals'
    })
  }
  for (const d of rows) {
    const po = d.price_outlook
    if (po && po.direction === 'up' && po.change_pct > 0) {
      notes.push({
        id: `si-price-${d.supplier}`,
        type: po.change_pct >= 8 ? 'urgent' : 'attention',
        title: { en: `${d.supplier}: ${d.commodity} forecast ↑ +${po.change_pct}%`, ar: `${d.supplier}: توقّع ${d.commodity} ↑ +${po.change_pct}%` },
        deptName: DEPT, ts: d.generated_at, read: false, link: '/supply-intelligence'
      })
    }
    for (const r of d.risks || []) {
      if (r.severity === 'high' || r.severity === 'medium') {
        notes.push({
          id: `si-risk-${d.supplier}-${(r.summary || '').slice(0, 24)}`,
          type: r.severity === 'high' ? 'urgent' : 'attention',
          title: { en: `${d.country} ${r.type}: ${r.summary}`, ar: `${d.country} ${r.type}: ${r.summary}` },
          deptName: DEPT, ts: d.generated_at, read: false, link: '/supply-intelligence'
        })
      }
    }
  }
  notes.sort((a, b) => (a.type === 'urgent' ? 0 : 1) - (b.type === 'urgent' ? 0 : 1) || b.ts.localeCompare(a.ts))
  return NextResponse.json(notes)
}
