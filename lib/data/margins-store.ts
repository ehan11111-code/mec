// Server-only: per-product TARGET margins — the "typable per-product margin". Stored in Supabase
// `product_margins` (item PK, target_margin %). The O2C margin gate (lib/o2c/margin.ts) reads these as
// overrides on top of the category floor. Falls back to {} when Supabase isn't configured (the gate then
// just uses the floors). NEVER import this in a client component (uses the service-role key).

function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}

export type TargetMargin = { item: string; target_margin: number; updated_by?: string | null; updated_at?: string | null }

export async function getTargetMarginRows(): Promise<TargetMargin[]> {
  const c = cfg()
  if (!c) return []
  try {
    const r = await fetch(`${c.url}/rest/v1/product_margins?select=*`, { headers: { apikey: c.key, Authorization: `Bearer ${c.key}` }, cache: 'no-store' })
    if (!r.ok) return []
    const j = await r.json()
    return Array.isArray(j) ? j : []
  } catch { return [] }
}

// item → target margin %, for evaluateOrder(inputs, overrides).
export async function getTargetMargins(): Promise<Record<string, number>> {
  const m: Record<string, number> = {}
  for (const r of await getTargetMarginRows()) if (r.item && typeof r.target_margin === 'number') m[r.item] = r.target_margin
  return m
}

// Set (upsert) or clear (target=null → back to the floor) one product's target margin. Returns true on success.
export async function setTargetMargin(item: string, target: number | null, user: string): Promise<boolean> {
  const c = cfg()
  if (!c) return false
  try {
    if (target == null) {
      const r = await fetch(`${c.url}/rest/v1/product_margins?item=eq.${encodeURIComponent(item)}`, {
        method: 'DELETE', headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, Prefer: 'return=minimal' }, cache: 'no-store'
      })
      return r.ok
    }
    const r = await fetch(`${c.url}/rest/v1/product_margins`, {
      method: 'POST',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ item, target_margin: target, updated_by: user, updated_at: new Date().toISOString() }), cache: 'no-store'
    })
    return r.ok
  } catch { return false }
}
