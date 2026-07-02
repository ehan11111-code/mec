// Server-only: analytics overlay for LIVE orders (portal + WhatsApp) read from whatsapp_intake. This is
// NOT the static imported books (those stay the accounting record — see PORTAL_AUDIT_AND_ROADMAP.md §2
// live-vs-static). Portal (O2C) orders carry a priced margin evaluation (raw.margin), so we can total
// revenue by salesperson and client; WhatsApp orders without prices count toward order VOLUME only.
import { getWhatsappIntake, type WhatsappMsg } from './supply'

export type LiveOrder = { id: string; client: string; salesperson: string; revenue: number; units: number; status: string; at: string; auto: boolean; source: 'portal' | 'whatsapp' }
export type NameAgg = { name: string; orders: number; revenue: number; lastAt: string }
export type LiveOrdersSummary = {
  count: number; revenue: number; pricedCount: number
  approved: number; pending: number; rejected: number; autoApproved: number
  bySalesperson: NameAgg[]; byClient: NameAgg[]; recent: LiveOrder[]; generatedAt: string
}

const revenueOf = (m: WhatsappMsg): number => { const t = (m as any).raw?.margin?.total; return typeof t === 'number' && isFinite(t) ? t : 0 }
const unitsOf = (m: WhatsappMsg) => (m.products || []).reduce((s, p) => s + (Number(p.qty) || 0), 0)
const isPortal = (m: WhatsappMsg) => (m as any).raw?.source === 'portal_o2c'

function aggregate(rows: LiveOrder[], key: 'client' | 'salesperson'): NameAgg[] {
  const map = new Map<string, NameAgg>()
  for (const r of rows) {
    const name = r[key] || '—'
    const cur = map.get(name) || { name, orders: 0, revenue: 0, lastAt: r.at }
    cur.orders++; cur.revenue += r.revenue
    if (r.at > cur.lastAt) cur.lastAt = r.at
    map.set(name, cur)
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.orders - a.orders)
}

export async function getLiveOrders(limit = 400): Promise<LiveOrdersSummary> {
  const msgs = await getWhatsappIntake(limit)
  const orders = msgs.filter(m => m.intent === 'order')
  const rows: LiveOrder[] = orders.map(m => ({
    id: m.message_id, client: m.client_name || '—', salesperson: m.salesperson || m.push_name || '—',
    revenue: revenueOf(m), units: unitsOf(m), status: m.order_status || 'pending', at: m.received_at,
    auto: isPortal(m) && m.order_status === 'approved', source: isPortal(m) ? 'portal' : 'whatsapp'
  }))
  const st = (s: string) => rows.filter(r => r.status === s).length
  return {
    count: rows.length, revenue: rows.reduce((s, r) => s + r.revenue, 0), pricedCount: rows.filter(r => r.revenue > 0).length,
    approved: st('approved'), pending: st('pending'), rejected: st('rejected'), autoApproved: rows.filter(r => r.auto).length,
    bySalesperson: aggregate(rows, 'salesperson'), byClient: aggregate(rows, 'client').slice(0, 12),
    recent: rows.slice().sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12), generatedAt: new Date().toISOString()
  }
}
