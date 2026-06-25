#!/usr/bin/env node
/**
 * Refresh the portal's CREDIT (المديونية) and INVENTORY (المخزون) data from the latest WhatsApp statement.
 *
 * The n8n intake reads each credit/inventory PDF and stores the parsed table rows in
 * whatsapp_intake.extracted. This script pulls the most recent of each and rewrites the two JSON seeds
 * (lib/data/credit.generated.json + inventory-count.generated.json), which the WHOLE portal reads — so
 * receivables (Control Center, CRM, Collections, Operations), the Credit page and the Inventory count all
 * move together, aligned, from one source.
 *
 *   node scripts/refresh-statements.js          # update both from Supabase
 *
 * After it runs, commit + push so Vercel redeploys (or let the scheduled task do it). Reads .env.local.
 */
const fs = require('fs'); const path = require('path')
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local'); if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
}
const num = (v) => { const n = Number(String(v).replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0 }

async function latest(SUPA, KEY, docType) {
  const url = `${SUPA}/rest/v1/whatsapp_intake?doc_type=eq.${docType}&extracted=not.is.null&archived=eq.false&select=received_at,extracted,body&order=received_at.desc&limit=1`
  const r = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  const j = await r.json()
  return Array.isArray(j) && j[0] ? j[0] : null
}

async function main() {
  loadEnv()
  const SUPA = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''); const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!SUPA || !KEY) { console.error('Missing Supabase env in .env.local'); process.exit(1) }
  const dataDir = path.join(__dirname, '..', 'lib', 'data')
  const asOf = (s) => (s ? String(s).slice(0, 10) : new Date().toISOString().slice(0, 10))
  let changed = 0

  // ── Credit ──
  const credit = await latest(SUPA, KEY, 'credit')
  if (credit && Array.isArray(credit.extracted) && credit.extracted.length) {
    const rows = credit.extracted.map(r => ({
      date: r.date || '', invoiceNo: String(r.invoiceNo || r.invoice_no || ''),
      salespersonAr: r.salespersonAr || r.salesperson || 'غير محدد',
      salespersonEn: r.salespersonEn || ({ 'محمود': 'Mahmoud', 'تامر': 'Tamer', 'عمرو': 'Amr' }[r.salespersonAr] || 'Unassigned'),
      client: r.client || '', amount: num(r.amount), ageDays: num(r.ageDays),
    })).filter(r => r.client && r.amount)
    if (rows.length) {
      const out = { asOf: asOf(credit.received_at), source: credit.body || '', rows }
      fs.writeFileSync(path.join(dataDir, 'credit.generated.json'), JSON.stringify(out, null, 2) + '\n')
      console.log(`✓ credit: ${rows.length} rows, total ${rows.reduce((s, r) => s + r.amount, 0).toFixed(2)} (as of ${out.asOf})`); changed++
    }
  } else { console.log('• credit: no new extracted statement (kept current)') }

  // ── Inventory ──
  const inv = await latest(SUPA, KEY, 'inventory')
  if (inv && Array.isArray(inv.extracted) && inv.extracted.length) {
    const rows = inv.extracted.map(r => ({ item: r.item || '', cartons: num(r.cartons), supplier: r.supplier || '' })).filter(r => r.item)
    if (rows.length) {
      const out = { asOf: asOf(inv.received_at), source: inv.body || '', rows }
      fs.writeFileSync(path.join(dataDir, 'inventory-count.generated.json'), JSON.stringify(out, null, 2) + '\n')
      console.log(`✓ inventory: ${rows.length} items (as of ${out.asOf})`); changed++
    }
  } else { console.log('• inventory: no new extracted statement (kept current)') }

  console.log(changed ? `\nRefreshed ${changed} file(s). Commit + push to deploy.` : '\nNothing to refresh.')
}
main().catch(e => { console.error(e); process.exit(1) })
