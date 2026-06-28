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
  doc_type?: 'po' | 'invoice' | 'delivery_note' | 'payment' | 'credit' | 'inventory' | 'other' | null
  group_jid?: string | null
  group_type?: 'orders' | 'docs' | 'dm' | null
  salesperson?: string | null              // sender display name — who brought the order
  quoted_message_id?: string | null        // reply target (threads approve/reject/adjust)
  decision?: 'approve' | 'reject' | 'adjust' | 'received' | null   // 'received' = delivery note confirmed (signed/stamped/تم الاستلام)
  order_no?: string | null                 // order / invoice / reference number
  client_name?: string | null              // client/company named on the order or document
  recipient?: string | null                // receiver / driver (المستلم) on a delivery note
  archived?: boolean | null                // test/cleared row — hidden from the portal, kept in the audit log
  extracted?: unknown                      // structured rows parsed from a credit/inventory statement
  raw?: unknown                            // full original webhook payload (admin debug / audit)
}

export type EmailMsg = {
  message_id: string; thread_id?: string | null; from_email: string; from_name: string
  subject: string; body: string
  intent: 'order' | 'inquiry' | 'complaint' | 'supplier' | 'payment' | 'other'
  products: { name: string; qty?: number | null; unit?: string | null }[]
  doc_type?: string | null; has_attachment?: boolean; attachments?: string[]
  summary?: string | null; received_at: string
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
// Operational reads hide `archived` rows (test data the admin cleared). The automation audit log passes
// includeArchived=true to keep showing them. Filtering happens in app code so it works even before the
// `archived` column exists (an undefined value is treated as not-archived).
const liveOnly = (rows: WhatsappMsg[]) => rows.filter(r => !r.archived)

export async function getWhatsappIntake(limit = 100, includeArchived = false) {
  const rows = await read<WhatsappMsg>(`whatsapp_intake?select=*&order=received_at.desc&limit=${limit}`)
  return includeArchived ? rows : liveOnly(rows)
}
export function getSupplyHistory(limit = 500) {
  return read<SupplyHistory>(`supply_intel_history?select=*&order=generated_at.asc&limit=${limit}`)
}
export async function getWhatsappOrders(limit = 100, includeArchived = false) {
  const rows = await read<WhatsappMsg>(`whatsapp_intake?intent=eq.order&select=*&order=received_at.desc&limit=${limit}`)
  return includeArchived ? rows : liveOnly(rows)
}
export function getEmailIntake(limit = 200) {
  return read<EmailMsg>(`email_intake?select=*&order=received_at.desc&limit=${limit}`)
}

// All WhatsApp documents of one type (invoice / delivery_note / payment), newest first, archived hidden.
// Powers the per-type document registries (/documents/invoices, /payments, /delivery-notes).
export async function getWhatsappDocs(docType: string, limit = 300) {
  const rows = await read<WhatsappMsg>(`whatsapp_intake?doc_type=eq.${encodeURIComponent(docType)}&select=*&order=received_at.desc&limit=${limit}`)
  return liveOnly(rows)
}

// The latest WhatsApp credit/inventory statement with its extracted table — powers the live Credit &
// Inventory pages so a newer المديونية/المخزون file refreshes the portal without a redeploy. Returns null
// when none has arrived yet (the page falls back to its built-in statement).
export async function getLatestExtracted(docType: 'credit' | 'inventory'): Promise<{ extracted: unknown; received_at: string; body: string } | null> {
  const rows = await read<{ extracted: unknown; received_at: string; body: string }>(
    `whatsapp_intake?doc_type=eq.${docType}&extracted=not.is.null&archived=eq.false&select=extracted,received_at,body&order=received_at.desc&limit=1`
  )
  return rows[0] || null
}

// Derive a statement's as-of date: prefer the date in the filename (…حتي تاريخ DD-MM-YYYY.pdf), else the
// day it was received.
export function statementAsOf(body: string, receivedAt: string): string {
  const m = /(\d{2})-(\d{2})-(\d{4})/.exec(body || '')
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return (receivedAt || '').slice(0, 10) || new Date().toISOString().slice(0, 10)
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

// Server-side: patch arbitrary fields on a single WhatsApp row. Used by the smart-reprocess engine to
// promote a missed order (intent/products) or apply a correction (client_name/products/decision).
// Returns true on success.
export async function patchWhatsapp(messageId: string, fields: Record<string, unknown>): Promise<boolean> {
  const c = cfg()
  if (!c) return false
  try {
    const r = await fetch(`${c.url}/rest/v1/whatsapp_intake?message_id=eq.${encodeURIComponent(messageId)}`, {
      method: 'PATCH',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(fields), cache: 'no-store'
    })
    return r.ok
  } catch { return false }
}

// Server-side: permanently delete a single WhatsApp row (an order/document/message). Unlike archive,
// this removes it from EVERY view including the automation audit log — used by the jarvis/admin "delete
// order" action. Because approvals, documents, the orders feed, the inbox and notifications all read the
// same `whatsapp_intake` table live, one delete propagates across the whole portal on the next refresh.
// Returns true on success.
export async function deleteWhatsapp(messageId: string): Promise<boolean> {
  const c = cfg()
  if (!c) return false
  try {
    const r = await fetch(`${c.url}/rest/v1/whatsapp_intake?message_id=eq.${encodeURIComponent(messageId)}`, {
      method: 'DELETE',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, Prefer: 'return=minimal' }, cache: 'no-store'
    })
    return r.ok
  } catch { return false }
}

// Server-side: archive WhatsApp rows so they disappear from the portal (orders / approvals / documents /
// inbox) but stay in the automation audit log. `restore` flips them back. Without a filter it archives
// every row (used by the admin "clear test data" action before launch). Returns true on success.
export async function archiveWhatsapp(opts: { restore?: boolean; before?: string } = {}): Promise<boolean> {
  const c = cfg()
  if (!c) return false
  // PostgREST refuses an unbounded write, so always carry a where-clause (every row by default).
  const where = opts.before
    ? `received_at=lte.${encodeURIComponent(opts.before)}`
    : 'message_id=neq.__none__'
  try {
    const r = await fetch(`${c.url}/rest/v1/whatsapp_intake?${where}`, {
      method: 'PATCH',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ archived: !opts.restore }), cache: 'no-store'
    })
    return r.ok
  } catch { return false }
}
