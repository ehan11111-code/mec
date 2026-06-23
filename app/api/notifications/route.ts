import { NextResponse } from 'next/server'
import { getSupplyIntel, getWhatsappOrders } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

type Bi = { en: string; ar: string }
type Note = { id: string; type: 'urgent' | 'attention' | 'update' | 'info' | 'approval'; title: Bi; deptName: Bi; ts: string; read: boolean; link: string }

const DEPT: Bi = { en: 'Supply intelligence', ar: 'استخبارات التوريد' }
const ORDERS: Bi = { en: 'Order approvals', ar: 'اعتماد الطلبات' }

// Derive live notifications from the supply-intelligence feed + pending WhatsApp orders.
export async function GET() {
  const [rows, orders] = await Promise.all([getSupplyIntel(), getWhatsappOrders(50)])
  const notes: Note[] = []
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
