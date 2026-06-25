// Credit / receivables (المديونية) — the authoritative outstanding-credit statement Tarek sends the team
// on WhatsApp (docs group). This file IS the source of truth for what clients currently owe: per invoice,
// the client, salesperson, amount (VAT-INCLUSIVE), and aging in days. Latest snapshot: 2026-06-25.
//
// Refreshed from `المديونية حتي تاريخ …pdf`. When a newer statement arrives, replace CREDIT_ROWS + CREDIT_AS_OF
// (the WhatsApp intake stores each file; `node scripts/wa-download.js <message_id>` pulls one to re-read).

export type CreditRow = {
  date: string            // invoice date (ISO)
  invoiceNo: string
  salespersonAr: string
  salespersonEn: string
  client: string          // client/company name (Arabic, as on the statement)
  amount: number          // outstanding amount, VAT-INCLUSIVE (المبلغ بعد الضريبة)
  ageDays: number         // days the receivable has been outstanding (اعمار الذمم)
}

// The data lives in credit.generated.json so it can be refreshed automatically from the latest WhatsApp
// statement (scripts/refresh-statements.js reads the n8n-extracted rows from Supabase and rewrites it).
// Editing that JSON — by hand or by the refresh script — updates receivables across the WHOLE portal.
import generated from './credit.generated.json'

export const CREDIT_AS_OF: string = (generated as any).asOf || '2026-06-25'
export const CREDIT_ROWS: CreditRow[] = ((generated as any).rows || []) as CreditRow[]

const VAT_RATE = 0.15
const round2 = (n: number) => Math.round(n * 100) / 100

export type CreditClient = { client: string; salespersonAr: string; salespersonEn: string; amount: number; invoices: number; maxAge: number; pct: number }
export type CreditBuckets = { current: number; d8_30: number; d31_60: number; over60: number }

export type CreditSummary = {
  asOf: string
  total: number                 // VAT-inclusive outstanding
  totalNet: number              // ex-VAT
  invoices: number
  clientCount: number
  overdueCount: number          // invoices older than 30 days
  overdueAmount: number
  avgAge: number
  rows: (CreditRow & { pct: number })[]
  byClient: CreditClient[]
  buckets: CreditBuckets
}

export function getCredit(): CreditSummary {
  const total = round2(CREDIT_ROWS.reduce((s, r) => s + r.amount, 0))
  const rows = CREDIT_ROWS.map(r => ({ ...r, pct: total ? r.amount / total : 0 }))
    .sort((a, b) => b.amount - a.amount)

  const cmap = new Map<string, CreditClient>()
  for (const r of CREDIT_ROWS) {
    const cur = cmap.get(r.client) ?? { client: r.client, salespersonAr: r.salespersonAr, salespersonEn: r.salespersonEn, amount: 0, invoices: 0, maxAge: 0, pct: 0 }
    cur.amount = round2(cur.amount + r.amount); cur.invoices++; cur.maxAge = Math.max(cur.maxAge, r.ageDays); cmap.set(r.client, cur)
  }
  const byClient = [...cmap.values()].map(c => ({ ...c, pct: total ? c.amount / total : 0 })).sort((a, b) => b.amount - a.amount)

  const buckets: CreditBuckets = { current: 0, d8_30: 0, d31_60: 0, over60: 0 }
  for (const r of CREDIT_ROWS) {
    if (r.ageDays <= 7) buckets.current += r.amount
    else if (r.ageDays <= 30) buckets.d8_30 += r.amount
    else if (r.ageDays <= 60) buckets.d31_60 += r.amount
    else buckets.over60 += r.amount
  }
  ;(Object.keys(buckets) as (keyof CreditBuckets)[]).forEach(k => (buckets[k] = round2(buckets[k])))

  const overdue = CREDIT_ROWS.filter(r => r.ageDays > 30)
  return {
    asOf: CREDIT_AS_OF,
    total,
    totalNet: round2(total / (1 + VAT_RATE)),
    invoices: CREDIT_ROWS.length,
    clientCount: byClient.length,
    overdueCount: overdue.length,
    overdueAmount: round2(overdue.reduce((s, r) => s + r.amount, 0)),
    avgAge: Math.round(CREDIT_ROWS.reduce((s, r) => s + r.ageDays, 0) / CREDIT_ROWS.length),
    rows, byClient, buckets,
  }
}

// name → outstanding amount (VAT-inclusive), keyed by the exact statement name.
export function creditByClientName(): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of CREDIT_ROWS) m.set(r.client, round2((m.get(r.client) ?? 0) + r.amount))
  return m
}

export const creditTotal = () => round2(CREDIT_ROWS.reduce((s, r) => s + r.amount, 0))
