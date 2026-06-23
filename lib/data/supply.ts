// Server-side reads of the live Supabase tables written by the n8n workflows.
// NEVER import this into a client component — it uses the service-role key. Falls back to [] when the
// env/tables aren't there yet, so the portal renders an empty state instead of erroring (CLAUDE.md §2).

export type Risk = {
  type: 'transport' | 'weather' | 'price' | 'disease' | 'policy' | 'other'
  severity: 'low' | 'medium' | 'high'
  summary: string
  citation?: { source?: string; url?: string; date?: string }
}
export type SupplyIntel = {
  supplier: string; commodity: string; country: string
  recommendation: string; forecast_window: string
  risks: Risk[]; generated_at: string
}
export type WhatsappMsg = {
  message_id: string; phone: string; push_name: string; body: string
  message_type: string; media_url: string
  intent: 'order' | 'inquiry' | 'complaint' | 'other'
  products: { name: string; qty?: number | null; unit?: string | null }[]
  verified: boolean; received_at: string
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
