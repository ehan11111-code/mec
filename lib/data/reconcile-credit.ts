// Credit reconciliation — SERVER ONLY. Turns payment / bank-transfer notes from WhatsApp into PROPOSED
// reductions of a client's outstanding credit line. The person in charge confirms each (never silent);
// confirmed ones are stored in credit_adjustments, and receivables = statement − Σ confirmed adjustments.
//
// Guardrails (brief §16): nothing is auto-applied. Extraction is imperfect on free-text bank notes, so the
// human is the gate — they see the note, the matched client, and the current→proposed line before applying.

import { getWhatsappIntake, getLatestExtracted, statementAsOf, type WhatsappMsg } from './supply'
import { parseCreditExtracted, buildCredit, creditTotal as staticCreditTotal, CREDIT_ROWS, CREDIT_AS_OF, type CreditClient } from './credit'

function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}

export type CreditAdjustment = { id: number; client: string | null; amount: number; source_message_id: string | null; note: string | null; confirmed_by: string | null; confirmed_at: string }

async function getAdjustments(): Promise<CreditAdjustment[]> {
  const c = cfg(); if (!c) return []
  try {
    const r = await fetch(`${c.url}/rest/v1/credit_adjustments?select=*&order=confirmed_at.desc`, { headers: { apikey: c.key, Authorization: `Bearer ${c.key}` }, cache: 'no-store' })
    if (!r.ok) return []
    const j = await r.json(); return Array.isArray(j) ? j : []
  } catch { return [] }
}

// Extract the money amount from a payment note. Picks the largest plausible SAR figure (handles 50,000 /
// 50000 / "50000 ريال" / "SAR 50000"). Returns 0 if none found.
export function extractAmount(text: string): number {
  const t = String(text || '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))   // Arabic-Indic → ASCII digits
  const nums = (t.match(/\d[\d,]*\.?\d*/g) || []).map(s => Number(s.replace(/,/g, ''))).filter(n => Number.isFinite(n) && n >= 100)
  return nums.length ? Math.max(...nums) : 0
}

const norm = (s: string) => String(s || '').replace(/[ـ]/g, '').replace(/[.،,0-9]/g, '').replace(/\s+/g, ' ').trim()
const toks = (s: string) => new Set(norm(s).split(' ').filter(w => w.length > 1))
function bestClient(name: string | null | undefined, clients: CreditClient[]): CreditClient | null {
  if (!name) return null
  const nt = toks(name); if (!nt.size) return null
  let best: { c: CreditClient; score: number } | null = null
  for (const c of clients) {
    const rt = toks(c.client); let overlap = 0
    for (const t of nt) if (rt.has(t)) overlap++
    const score = overlap / Math.max(1, nt.size + rt.size - overlap)
    if (overlap >= 1 && (!best || score > best.score)) best = { c, score }
  }
  return best && best.score >= 0.34 ? best.c : null
}

const isPaymentNote = (m: WhatsappMsg) => m.doc_type === 'payment' || m.understanding?.type === 'payment' || m.understanding?.type === 'bank_transfer'

export type PaymentProposal = {
  message_id: string; received_at: string; noteText: string; amount: number
  who: string | null; matchedClient: string | null
  currentOutstanding: number | null; proposedOutstanding: number | null
  confidence: 'high' | 'medium' | 'low'; hasFile: boolean
}

export type Reconciliation = {
  asOf: string
  statementTotal: number          // outstanding per the latest statement
  confirmedTotal: number          // Σ confirmed payment adjustments since
  effectiveTotal: number          // statement − confirmed (current credit line)
  proposals: PaymentProposal[]    // payment notes awaiting confirmation
  adjustments: CreditAdjustment[] // already confirmed
}

// Build the reconciliation: the live statement, confirmed adjustments, and proposals from payment notes.
export async function reconcile(limit = 120): Promise<Reconciliation> {
  // 1. Current statement (live extracted, else the built-in one).
  const live = await getLatestExtracted('credit')
  const rows = live ? parseCreditExtracted(live.extracted) : CREDIT_ROWS
  const asOf = live && rows.length ? statementAsOf(live.body, live.received_at) : CREDIT_AS_OF
  const summary = buildCredit(rows, asOf)
  const statementTotal = summary.total || staticCreditTotal()

  // 2. Confirmed adjustments + which notes are already applied.
  const adjustments = await getAdjustments()
  const applied = new Set(adjustments.map(a => a.source_message_id).filter(Boolean) as string[])
  const confirmedTotal = Math.round(adjustments.reduce((s, a) => s + (Number(a.amount) || 0), 0) * 100) / 100

  // 3. Payment notes since the statement → proposals.
  const msgs = await getWhatsappIntake(limit)
  const statementDate = Date.parse(asOf) || 0
  const proposals: PaymentProposal[] = []
  for (const m of msgs) {
    if (!isPaymentNote(m) || applied.has(m.message_id)) continue
    const text = (m.body || m.media_filename || '').toString()
    const amount = extractAmount(text)
    if (amount <= 0) continue
    // Only notes at/after the statement date matter (older ones are baked into the statement).
    if (statementDate && Date.parse(m.received_at) < statementDate - 2 * 864e5) continue
    const who = m.understanding?.who || m.client_name || null
    const mc = bestClient(who, summary.byClient)
    const current = mc ? mc.amount : null
    proposals.push({
      message_id: m.message_id, received_at: m.received_at, noteText: text.slice(0, 200), amount,
      who, matchedClient: mc?.client || null,
      currentOutstanding: current, proposedOutstanding: current != null ? Math.round((current - amount) * 100) / 100 : null,
      confidence: mc && amount ? 'high' : amount ? 'medium' : 'low',
      hasFile: m.media_status === 'cached',
    })
  }
  return {
    asOf, statementTotal, confirmedTotal,
    effectiveTotal: Math.round((statementTotal - confirmedTotal) * 100) / 100,
    proposals, adjustments,
  }
}

// Confirm a payment → write a credit_adjustments row (the human-in-the-loop apply). Returns true on success.
export async function confirmAdjustment(a: { client: string | null; amount: number; source_message_id: string; note?: string; confirmed_by: string }): Promise<boolean> {
  const c = cfg(); if (!c) return false
  try {
    const r = await fetch(`${c.url}/rest/v1/credit_adjustments`, {
      method: 'POST',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ client: a.client, amount: a.amount, source_message_id: a.source_message_id, note: a.note || null, confirmed_by: a.confirmed_by }),
      cache: 'no-store',
    })
    return r.ok
  } catch { return false }
}

// The effective receivables total (statement − confirmed adjustments) — for the headline KPIs.
export async function effectiveReceivables(): Promise<{ total: number; statementTotal: number; confirmedTotal: number; asOf: string }> {
  const r = await reconcile()
  return { total: r.effectiveTotal, statementTotal: r.statementTotal, confirmedTotal: r.confirmedTotal, asOf: r.asOf }
}
