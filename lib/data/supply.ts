// Server-side reads of the live Supabase tables written by the n8n workflows.
// NEVER import this into a client component — it uses the service-role key. Falls back to [] when the
// env/tables aren't there yet, so the portal renders an empty state instead of erroring (CLAUDE.md §2).

export type Risk = {
  type: 'transport' | 'weather' | 'price' | 'disease' | 'policy' | 'other'
  severity: 'low' | 'medium' | 'high'
  summary: string
  citation?: { source?: string; url?: string; date?: string }
}
export type PriceDriver = { summary: string; citation?: { source?: string; url?: string; date?: string } }
export type PriceOutlook = {
  direction: 'up' | 'down' | 'stable'
  change_pct: number; low_pct: number; high_pct: number
  confidence: 'low' | 'medium' | 'high'
  drivers: PriceDriver[]
}
export type SupplyIntel = {
  supplier: string; commodity: string; country: string
  recommendation: string; forecast_window: string
  price_outlook?: PriceOutlook | null
  lead_time_days?: number | null
  price_index?: number | null
  risks: Risk[]; generated_at: string
}
export type SupplyHistory = {
  supplier: string; commodity: string; country: string
  change_pct: number; price_index: number; lead_time_days: number
  risk_count: number; high_risk: number; generated_at: string
}
export type WhatsappMsg = {
  message_id: string; phone: string; push_name: string; body: string
  message_type: string; media_url: string
  intent: 'order' | 'inquiry' | 'complaint' | 'approval' | 'other'
  products: { name: string; qty?: number | null; unit?: string | null }[]
  verified: boolean; received_at: string
  order_status?: 'pending' | 'approved' | 'rejected' | null
  doc_type?: 'po' | 'invoice' | 'delivery_note' | 'payment' | 'other' | null
  group_jid?: string | null
  group_type?: 'orders' | 'docs' | 'dm' | null
  salesperson?: string | null              // sender display name — who brought the order
  quoted_message_id?: string | null        // reply target (threads approve/reject/adjust)
  decision?: 'approve' | 'reject' | 'adjust' | null
}

function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}

async function read<T>(path: string): Promise<T[]> {
  const c = cfg()
  if (!c) return []
  try {
    const r = await fetch(`${c.url}/rest/v1/${path}`, {
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}` },
      cache: 'no-store'
    })
    if (!r.ok) return []
    const j = await r.json()
    return Array.isArray(j) ? j : []
  } catch { return [] }
}

export const supplyConfigured = () => !!cfg()

export function getSupplyIntel() {
  return read<SupplyIntel>('supply_intel?select=*&order=generated_at.desc')
}
export function getWhatsappIntake(limit = 100) {
  return read<WhatsappMsg>(`whatsapp_intake?select=*&order=received_at.desc&limit=${limit}`)
}
export function getSupplyHistory(limit = 500) {
  return read<SupplyHistory>(`supply_intel_history?select=*&order=generated_at.asc&limit=${limit}`)
}
export function getWhatsappOrders(limit = 100) {
  return read<WhatsappMsg>(`whatsapp_intake?intent=eq.order&select=*&order=received_at.desc&limit=${limit}`)
}

// Server-side: set a WhatsApp order's approval status. Returns true on success.
export async function setOrderStatus(messageId: string, status: 'approved' | 'rejected'): Promise<boolean> {
  const c = cfg()
  if (!c) return false
  try {
    const r = await fetch(`${c.url}/rest/v1/whatsapp_intake?message_id=eq.${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ order_status: status }), cache: 'no-store'
    })
    return r.ok
  } catch { return false }
}
