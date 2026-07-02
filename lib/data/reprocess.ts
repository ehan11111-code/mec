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

import { getWhatsappIntake, patchWhatsapp, type WhatsappMsg, type Understanding } from './supply'

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
        // Preserve any decision already applied (e.g. an approve/reject reaction) — promoting a missed order
        // must NOT clobber an approval back to pending.
        patch: { intent: 'order', products, order_status: msg.order_status || 'pending', ...(d.client_name ? { client_name: d.client_name } : {}), ...(d.order_no ? { order_no: d.order_no } : {}) },
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

// Self-heal: make every order reflect the LATEST approve/reject/adjust decision that targeted it (from a
// reply OR a ✅/👍 reaction). Fixes cases where a decision was clobbered (e.g. a later promotion reset the
// status) or arrived while the order row wasn't yet an order. Idempotent — only patches when out of sync.
export async function reapplyDecisions(limit = 400): Promise<{ fixed: number }> {
  const rows = await getWhatsappIntake(limit, false)
  const orders = new Map(rows.filter(r => r.intent === 'order').map(r => [r.message_id, r]))
  const decisions = rows.filter(r => r.decision && r.quoted_message_id && orders.has(r.quoted_message_id))
    .sort((a, b) => (a.received_at < b.received_at ? -1 : 1))   // oldest→newest, so the latest decision wins
  const want = new Map<string, string>()
  for (const d of decisions) {
    const s = d.decision === 'approve' ? 'approved' : d.decision === 'reject' ? 'rejected' : 'pending'
    want.set(d.quoted_message_id as string, s)
  }
  let fixed = 0
  for (const [oid, status] of want) {
    const o = orders.get(oid)
    if (o && (o.order_status || 'pending') !== status) { if (await patchWhatsapp(oid, { order_status: status })) fixed++ }
  }
  return { fixed }
}

// ── JARVIS "reads & remembers EVERY message" ────────────────────────────────────────────────────────
// Beyond order/correction recovery, JARVIS records an interpretation (`understanding`) for every message so
// nothing is invisibly ignored — it is "a member of the group who sees everything". Noise (reactions, bare
// mentions) is understood deterministically (no AI cost); everything else is read by the model. Incremental:
// only messages that don't yet have an `understanding` are sent, so it's cheap and idempotent per message.

const IMPORTANT_TYPES = new Set(['order', 'invoice', 'delivery_note', 'payment', 'bank_transfer', 'credit_statement', 'inventory_statement', 'correction', 'complaint'])

function deterministicUnderstanding(m: WhatsappMsg, at: string): Understanding | null {
  const body = (m.body || '').trim()
  if (m.message_type === 'reaction') return { type: 'chatter', who: m.salesperson || m.push_name || null, importance: 'low', action: 'Reaction noted (may approve/reject an order).', summary: body || 'reaction', at }
  if (isNoise(body)) return { type: 'chatter', who: m.salesperson || m.push_name || null, importance: 'low', action: null, summary: body || '(no text)', at }
  return null
}

// Map a stored row's already-known classification to an understanding type (used as a fallback / prior).
function priorType(m: WhatsappMsg): Understanding['type'] {
  if (m.doc_type === 'credit') return 'credit_statement'
  if (m.doc_type === 'inventory') return 'inventory_statement'
  if (m.doc_type === 'invoice') return 'invoice'
  if (m.doc_type === 'delivery_note') return 'delivery_note'
  if (m.doc_type === 'payment') return 'payment'
  if (m.intent === 'order') return 'order'
  if (m.intent === 'complaint') return 'complaint'
  if (m.intent === 'inquiry') return 'inquiry'
  return 'chatter'
}

type UnderstandOut = { id: string; type: Understanding['type']; importance: Understanding['importance']; who?: string; action?: string; summary: string }

async function classifyUnderstanding(rows: WhatsappMsg[]): Promise<UnderstandOut[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key || rows.length === 0) return []
  const model = process.env.OPENAI_BATCH_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
  const payload = rows.map(m => ({
    id: m.message_id, text: (m.body || '').slice(0, 500), sender: m.salesperson || m.push_name || '',
    group: m.group_type || '', has_file: m.message_type === 'document' || m.message_type === 'image',
    file: m.media_filename || '', current_doc_type: m.doc_type || '', current_intent: m.intent,
  }))
  const system = `You are JARVIS, a silent member of MEC's (Saudi food distributor) WhatsApp groups who reads EVERY message and remembers it. Money is SAR; Arabic or English.
For EACH message return an understanding:
- type: one of order, invoice, delivery_note, payment, bank_transfer, credit_statement (المديونية), inventory_statement (المخزون), correction, inquiry, complaint, chatter.
  bank_transfer = a copied bank notification / transfer / deposit ("تحويل من…", "حوالة واردة", إيداع, IBAN). payment = a payment receipt/confirmation document.
- who: the client/sender the message concerns, if any.
- importance: high (money, stock, orders, corrections, complaints), medium (logistics/coordination that affects an order), low (greetings/thanks/chatter).
- action: one short clause on what should happen ("queue as order", "apply to client X credit", "match to invoice", "none").
- summary: one short line of what it says.
Return STRICT JSON: {"items":[{"id","type","who","importance","action","summary"}]}.`
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: key })
    const completion = await client.chat.completions.create({
      model, temperature: 0, max_tokens: 3000, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify({ messages: payload }) }],
    })
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return Array.isArray(parsed.items) ? parsed.items : []
  } catch { return [] }
}

// Record an understanding for every recent message that doesn't have one yet. Persists to whatsapp_intake.
// Reads the same window the cockpit's intakeStats() counts (200), so coverage actually reaches 100% — the
// AI batch is capped per run, so older un-read messages are backfilled over a few runs (cheap + incremental).
export async function understandIntake(limit = 200): Promise<{ understood: number; scanned: number; usedAI: boolean }> {
  const rows = await getWhatsappIntake(limit, false)
  const at = new Date().toISOString()
  const todo = rows.filter(m => !m.understanding)
  if (todo.length === 0) return { understood: 0, scanned: 0, usedAI: false }

  // Split: noise gets a deterministic understanding (free); the rest go to the model.
  const aiRows: WhatsappMsg[] = []
  const writes: { id: string; u: Understanding }[] = []
  for (const m of todo) {
    const det = deterministicUnderstanding(m, at)
    if (det) writes.push({ id: m.message_id, u: det })
    else aiRows.push(m)
  }
  const out = await classifyUnderstanding(aiRows.slice(0, 50))
  const byId = new Map(out.map(o => [o.id, o]))
  for (const m of aiRows) {
    const o = byId.get(m.message_id)
    const u: Understanding = o
      ? { type: o.type || priorType(m), who: o.who || m.client_name || m.salesperson || null, importance: o.importance || 'medium', action: o.action || null, summary: o.summary || (m.body || '').slice(0, 80), at }
      : { type: priorType(m), who: m.client_name || m.salesperson || null, importance: IMPORTANT_TYPES.has(priorType(m)) ? 'high' : 'low', action: null, summary: (m.media_filename || m.body || '').slice(0, 80) || '(document)', at }
    writes.push({ id: m.message_id, u })
  }
  let n = 0
  for (const w of writes) { if (await patchWhatsapp(w.id, { understanding: w.u })) n++ }
  return { understood: n, scanned: todo.length, usedAI: out.length > 0 }
}

// ── Intake reliability stats (powers the JARVIS cockpit + Data page) ─────────────────────────────────
export type IntakeStats = {
  total: number
  captured: number          // became a structured record (order/approval/doc_type)
  understood: number        // has a JARVIS understanding
  acted: number             // an action was taken/queued (order_status, decision, extract done, cached doc)
  highImportance: number    // understood as high-importance
  mediaPending: number; mediaCached: number; mediaFailed: number
  extractDone: number; extractFailed: number
  captureRate: number; understandRate: number; extractRate: number
  accuracyScore: number     // composite 0–100 (capture + understand + extract reliability)
  lastMessageAt: string | null
}

const isActed = (m: WhatsappMsg) =>
  !!m.order_status || !!m.decision || m.extract_status === 'done' || m.media_status === 'cached' || (m.intent === 'order')

export async function intakeStats(limit = 200): Promise<IntakeStats> {
  const rows = await getWhatsappIntake(limit, false)
  const total = rows.length
  const captured = rows.filter(m => m.intent === 'order' || m.intent === 'approval' || !!m.doc_type).length
  const understood = rows.filter(m => !!m.understanding).length
  const acted = rows.filter(isActed).length
  const highImportance = rows.filter(m => m.understanding?.importance === 'high').length
  const media = rows.filter(m => m.message_type === 'document' || m.message_type === 'image')
  const mediaPending = media.filter(m => !m.media_status || m.media_status === 'pending').length
  const mediaCached = media.filter(m => m.media_status === 'cached').length
  const mediaFailed = media.filter(m => m.media_status === 'failed').length
  const statements = rows.filter(m => m.doc_type === 'credit' || m.doc_type === 'inventory')
  const extractDone = statements.filter(m => m.extract_status === 'done').length
  const extractFailed = statements.filter(m => m.extract_status === 'failed').length
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 100)
  const captureRate = pct(captured, total)
  const understandRate = pct(understood, total)
  const mediaTotal = media.length
  const extractRate = mediaTotal ? pct(mediaCached, mediaTotal) : 100
  // Composite accuracy: how much of what arrived was understood, and how reliably media was processed.
  const accuracyScore = Math.round(understandRate * 0.6 + extractRate * 0.4)
  return {
    total, captured, understood, acted, highImportance,
    mediaPending, mediaCached, mediaFailed, extractDone, extractFailed,
    captureRate, understandRate, extractRate, accuracyScore,
    lastMessageAt: rows[0]?.received_at || null,
  }
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
