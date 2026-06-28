// Smart intake reprocessor — SERVER ONLY (uses the OpenAI key + service-role Supabase).
//
// Goal: make the WhatsApp intake intelligent. It re-reads recent messages and finds two things the
// first-pass classifier misses:
//   1. MISSED ORDERS — messages that clearly place an order (qty + product, often price/client) but were
//      filed as `other` (e.g. an order sent into the docs/unknown group).
//   2. CORRECTIONS — a message that fixes a PRIOR order/invoice ("sold to Kanz, not Al-Kadi"; change a
//      quantity/price; cancel) — it computes the patch and applies it to the right record.
//
// Applying a change PATCHes `whatsapp_intake`, the single live source every portal page reads — so the
// whole portal self-corrects. Guardrails (CLAUDE.md §6): promotions only ever set an order to *pending*
// (a human still approves it — never auto-approved); data-changing corrections need high confidence to
// auto-apply, otherwise they're queued for a one-click human review on the Data page.

import { getWhatsappIntake, patchWhatsapp, type WhatsappMsg } from './supply'

export type ReprocessChange = {
  targetId: string           // the row that gets patched
  triggerId: string          // the message that caused the change (order itself, or the correction msg)
  kind: 'promote_order' | 'correction'
  confidence: number         // 0–1, from the model
  reason: string
  patch: Record<string, unknown>
  before: string
  after: string
  auto: boolean              // eligible for automatic application
}

const isNoise = (b: string) => !b || /^reacted\b/i.test(b.trim()) || /^@\d+$/.test(b.trim()) || b.trim().length < 3
const ORDER_HINT = /(كرتون|صندوق|سعر|طلب|كيلو|طن|\bqty\b|\bprice\b|\bcarton)/i
const CORRECTION_HINT = /(ليس|وليس|بدل|بدلاً|الصحيح|عدّل|عدل|غلط|خطأ|تعديل|الغاء|إلغاء|not\s|instead|correct|cancel|change)/i
const summariseProducts = (ps?: WhatsappMsg['products']) => (ps || []).map(p => `${p.name}${p.qty ? ` ×${p.qty}` : ''}${p.unit ? ` ${p.unit}` : ''}`).join('، ') || '—'

// Pick the messages worth sending to the model: uncaptured order-like, or anything that reads like a
// correction (incl. reply threads). Capped to keep the call cheap.
function candidates(rows: WhatsappMsg[]): WhatsappMsg[] {
  const out: WhatsappMsg[] = []
  for (const m of rows) {
    if (m.archived) continue
    const body = (m.body || '').trim()
    if (isNoise(body)) continue
    const captured = m.intent === 'order' || !!m.doc_type
    const orderLike = !captured && ORDER_HINT.test(body)
    const correctionLike = !!m.quoted_message_id || CORRECTION_HINT.test(body)
    if (orderLike || correctionLike) out.push(m)
  }
  return out.slice(0, 25)
}

type Decision = {
  id: string
  kind: 'order' | 'correction' | 'irrelevant'
  confidence: number
  client_name?: string
  order_no?: string
  target_order_no?: string
  cancel?: boolean
  products?: { name: string; qty?: number | null; unit?: string | null }[]
  reason?: string
}

async function classify(cands: WhatsappMsg[], byId: Map<string, WhatsappMsg>): Promise<Decision[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key || cands.length === 0) return []
  const model = process.env.OPENAI_BATCH_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const payload = cands.map(m => {
    const q = m.quoted_message_id ? byId.get(m.quoted_message_id) : undefined
    return {
      id: m.message_id, text: (m.body || '').slice(0, 600), sender: m.salesperson || m.push_name || '',
      group: m.group_type || '', current_intent: m.intent,
      replying_to: q ? { order_no: q.order_no || null, client: q.client_name || null, products: summariseProducts(q.products), text: (q.body || '').slice(0, 200) } : null
    }
  })
  const system = `You are JARVIS, classifying MEC (Saudi food distributor) WhatsApp messages. Money is SAR; messages are Arabic or English.
For EACH message decide one "kind":
- "order": it places/contains a product order (a quantity + product, usually a price and/or a client name). Extract products [{name, qty, unit, price}], client_name, order_no if present.
- "correction": it CORRECTS a prior order/invoice — changes the client, a quantity, a price, or cancels it. Use replying_to for context. Extract: target_order_no (the invoice/order it fixes, if known), client_name (the corrected/right client), products (corrected lines), cancel (true if it cancels).
- "irrelevant": greetings, reactions, acknowledgements, chatter, or anything with no actionable data.
Be conservative: only "order"/"correction" when you are reasonably sure. Give confidence 0–1.
Return STRICT JSON: {"decisions":[{"id","kind","confidence","client_name","order_no","target_order_no","cancel","products":[{"name","qty","unit"}],"reason"}]}. Omit fields you can't fill.`
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: key })
    const completion = await client.chat.completions.create({
      model, temperature: 0.1, max_tokens: 1500, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify({ messages: payload }) }]
    })
    const raw = completion.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.decisions) ? parsed.decisions : []
  } catch { return [] }
}

// Find the order a correction targets: explicit order number → quoted message → most recent order before it.
function resolveTarget(corr: WhatsappMsg, d: Decision, rows: WhatsappMsg[], byId: Map<string, WhatsappMsg>): WhatsappMsg | undefined {
  if (d.target_order_no) { const t = rows.find(r => r.order_no && r.order_no === d.target_order_no); if (t) return t }
  if (corr.quoted_message_id) { const t = byId.get(corr.quoted_message_id); if (t) return t }
  const before = rows.filter(r => r.intent === 'order' && r.received_at <= corr.received_at).sort((a, b) => (a.received_at < b.received_at ? 1 : -1))
  return before[0]
}

// Analyse recent intake and return proposed changes (does not apply them).
export async function analyzeIntake(limit = 80): Promise<{ changes: ReprocessChange[]; scanned: number; usedAI: boolean }> {
  const rows = await getWhatsappIntake(limit, false)
  const byId = new Map(rows.map(r => [r.message_id, r]))
  const cands = candidates(rows)
  const decisions = await classify(cands, byId)
  const usedAI = decisions.length > 0
  const changes: ReprocessChange[] = []

  for (const d of decisions) {
    const msg = byId.get(d.id)
    if (!msg || d.kind === 'irrelevant' || !d.confidence || d.confidence < 0.5) continue

    if (d.kind === 'order' && msg.intent !== 'order') {
      const products = (d.products && d.products.length ? d.products : msg.products) || []
      changes.push({
        targetId: msg.message_id, triggerId: msg.message_id, kind: 'promote_order', confidence: d.confidence,
        reason: d.reason || 'Looks like an order that was filed as other.',
        patch: { intent: 'order', products, order_status: 'pending', ...(d.client_name ? { client_name: d.client_name } : {}), ...(d.order_no ? { order_no: d.order_no } : {}) },
        before: `other · "${(msg.body || '').slice(0, 60)}"`,
        after: `order (pending) · ${summariseProducts(products)}${d.client_name ? ` · ${d.client_name}` : ''}`,
        auto: d.confidence >= 0.7        // promotions are safe: they land in the approvals queue for a human
      })
    } else if (d.kind === 'correction') {
      const target = resolveTarget(msg, d, rows, byId)
      if (!target) continue
      const patch: Record<string, unknown> = { decision: 'adjust' }
      if (d.cancel) patch.order_status = 'rejected'
      if (d.client_name && d.client_name !== target.client_name) patch.client_name = d.client_name
      if (d.products && d.products.length) patch.products = d.products
      if (Object.keys(patch).length <= 1) continue   // nothing concrete to change
      const beforeBits = [target.order_no ? `#${target.order_no}` : '', target.client_name || '', summariseProducts(target.products)].filter(Boolean).join(' · ')
      const afterBits = [target.order_no ? `#${target.order_no}` : '', (patch.client_name as string) || target.client_name || '', d.cancel ? 'CANCELLED' : summariseProducts((patch.products as any) || target.products)].filter(Boolean).join(' · ')
      changes.push({
        targetId: target.message_id, triggerId: msg.message_id, kind: 'correction', confidence: d.confidence,
        reason: d.reason || `Correction: "${(msg.body || '').slice(0, 80)}"`,
        patch, before: beforeBits || '—', after: afterBits || '—',
        auto: d.confidence >= 0.85 && (!!msg.quoted_message_id || !!d.target_order_no)  // corrections change data → high bar
      })
    }
  }
  return { changes, scanned: cands.length, usedAI }
}

export async function applyChange(ch: ReprocessChange): Promise<boolean> {
  return patchWhatsapp(ch.targetId, ch.patch)
}

// Apply a set of changes. `mode: 'auto'` applies only auto-eligible ones; `'all'` applies every passed
// change (used when an admin clicks Apply on a specific proposal). Returns how many were applied.
export async function applyChanges(changes: ReprocessChange[], mode: 'auto' | 'all' = 'auto'): Promise<number> {
  let n = 0
  for (const ch of changes) {
    if (mode === 'auto' && !ch.auto) continue
    if (await applyChange(ch)) n++
  }
  return n
}
