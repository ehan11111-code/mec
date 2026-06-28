#!/usr/bin/env node
/**
 * Accurate extraction of Tarek's المخزون (inventory) / المديونية (credit) statements via Google Vision OCR.
 *
 * WHY: the n8n intake extracted these from the PDF's embedded text, but the files use a custom-encoded
 * Arabic font, so the text pipeline misreads them (wrong item names, missed rows). Google Vision reads the
 * actual rendered table correctly. This script OCRs the latest cached PDF (positional, so columns/rows are
 * preserved), structures it with GPT, and rewrites the generated JSON — so the portal shows the real
 * numbers. Run on a machine with the cached files + keys (wired into refresh-statements.ps1).
 *
 *   node scripts/ocr-statement.js            # both
 *   node scripts/ocr-statement.js inventory  # one
 *
 * Reads .env.local (GOOGLE_VISION_API_KEY, OPENAI_API_KEY, Supabase).
 */
const fs = require('fs'); const path = require('path')
function loadEnv() {
  const p = path.join(__dirname, '..', '.env.local'); if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
}
const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0 }

// Vision OCR (positional) → table rows reconstructed by y/x, returned as plain lines (RTL order).
async function ocrRows(VKEY, pdfBuf) {
  const r = await fetch('https://vision.googleapis.com/v1/files:annotate?key=' + VKEY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ inputConfig: { content: pdfBuf.toString('base64'), mimeType: 'application/pdf' }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], pages: [1, 2, 3, 4, 5] }] })
  })
  const j = await r.json()
  if (j.error || j.responses?.[0]?.error) throw new Error(JSON.stringify(j.error || j.responses[0].error).slice(0, 200))
  const lines = []
  for (const resp of (j.responses[0].responses || [])) {
    const page = resp.fullTextAnnotation?.pages?.[0]; if (!page) continue
    const words = []
    for (const b of page.blocks) for (const p of b.paragraphs) for (const w of p.words) {
      const t = w.symbols.map(s => s.text).join('')
      const xs = w.boundingBox.normalizedVertices.map(v => v.x || 0); const ys = w.boundingBox.normalizedVertices.map(v => v.y || 0)
      words.push({ t, x: (xs[0] + xs[2]) / 2, y: (ys[0] + ys[2]) / 2 })
    }
    words.sort((a, b) => a.y - b.y)
    let cur = [], lastY = -1
    for (const w of words) { if (lastY < 0 || Math.abs(w.y - lastY) < 0.012) cur.push(w); else { lines.push(cur); cur = [w] } lastY = w.y }
    if (cur.length) lines.push(cur)
  }
  return lines.map(row => row.sort((a, b) => b.x - a.x).map(w => w.t).join(' '))
}

// Deterministic parse of the inventory table from the reconstructed RTL rows. Each item row is:
// [عاصمة الدجاج] <product> <cartons>. "الإجمالي" rows are subtotals → skipped; header skipped.
// The quantity is the trailing number; everything before it (minus the supplier prefix) is the product.
function parseInventory(lines) {
  const out = []
  for (const line of lines) {
    const toks = line.split(/\s+/).filter(Boolean)
    if (toks.length < 2) continue
    if (toks.includes('الصنف') || toks.includes('بالكرتون') || toks.includes('كجم')) continue   // header
    if (toks[0] === 'الإجمالي') continue                                                          // subtotal
    const last = toks[toks.length - 1]
    if (!/^\d[\d.,]*$/.test(last)) continue
    const cartons = num(last)
    let words = toks.slice(0, -1)
    if (words[0] === 'عاصمة' && words[1] === 'الدجاج') words = words.slice(2)                       // supplier prefix
    const item = words.join(' ').replace(/\s+/g, ' ').trim()
    if (item && cartons) out.push({ item, cartons })
  }
  return out
}

async function gptExtract(OKEY, kind, ocrText) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  const prompt = kind === 'inventory'
    ? `This is a warehouse stock count (المخزون). Each data row is: an optional supplier prefix "عاصمة الدجاج", then the product name (الصنف), then the quantity in cartons (الكمية بالكرتون). "الإجمالي" rows are subtotals — SKIP them. SKIP the header. Strip the "عاصمة الدجاج" supplier words from the product name. Return STRICT JSON {"rows":[{"item": "<product, Arabic>", "cartons": <number>}]}.`
    : `This is an accounts-receivable statement (المديونية). Extract each invoice row: date, invoice number, client name, salesperson (Arabic), outstanding amount (VAT-inclusive), and age in days if present. Skip totals/header. Return STRICT JSON {"rows":[{"date":"YYYY-MM-DD","invoiceNo":"","client":"","salespersonAr":"","amount":<n>,"ageDays":<n>}]}.`
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: OKEY })
  const c = await client.chat.completions.create({
    model, temperature: 0, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'OCR rows (RTL):\n' + ocrText }]
  })
  return JSON.parse(c.choices[0]?.message?.content || '{}').rows || []
}

async function latestCachedPdf(SUPA, KEY, docType) {
  const r = await fetch(`${SUPA}/rest/v1/whatsapp_intake?doc_type=eq.${docType}&select=message_id,body,received_at&order=received_at.desc&limit=1`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  const row = (await r.json())[0]; if (!row) return null
  const st = await fetch(`${SUPA}/storage/v1/object/wa-media/${encodeURIComponent(row.message_id)}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!st.ok) return null
  return { buf: Buffer.from(await st.arrayBuffer()), body: row.body || '', received_at: row.received_at }
}
const SALES_EN = { 'محمود': 'Mahmoud', 'تامر': 'Tamer', 'عمرو': 'Amr' }
const asOfFrom = (body, received) => { const m = /(\d{2})-(\d{2})-(\d{4})/.exec(body || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : (received || '').slice(0, 10) }

async function main() {
  loadEnv()
  const SUPA = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, ''); const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const VKEY = process.env.GOOGLE_VISION_API_KEY; const OKEY = process.env.OPENAI_API_KEY
  if (!SUPA || !KEY || !VKEY || !OKEY) { console.error('Need Supabase + GOOGLE_VISION_API_KEY + OPENAI_API_KEY in .env.local'); process.exit(1) }
  const which = process.argv[2] ? [process.argv[2]] : ['inventory', 'credit']
  const dataDir = path.join(__dirname, '..', 'lib', 'data')

  for (const kind of which) {
    const docType = kind === 'inventory' ? 'inventory' : 'credit'
    const pdf = await latestCachedPdf(SUPA, KEY, docType)
    if (!pdf) { console.log(`• ${kind}: no cached PDF`); continue }
    const ocr = await ocrRows(VKEY, pdf.buf)
    // Inventory is a clean table → parse deterministically (GPT is inconsistent on the subtotal rows).
    const rows = kind === 'inventory' ? parseInventory(ocr) : await gptExtract(OKEY, kind, ocr.join('\n'))
    const asOf = asOfFrom(pdf.body, pdf.received_at)

    if (kind === 'inventory') {
      const clean = rows.map(r => ({ item: String(r.item || '').trim(), cartons: num(r.cartons), supplier: 'عاصمة الدجاج' })).filter(r => r.item && r.cartons)
      const out = { asOf, source: pdf.body, ocr: true, rows: clean }
      fs.writeFileSync(path.join(dataDir, 'inventory-count.generated.json'), JSON.stringify(out, null, 2) + '\n')
      console.log(`✓ inventory (OCR): ${clean.length} items, total ${clean.reduce((s, r) => s + r.cartons, 0)} cartons (as of ${asOf})`)
      clean.forEach(r => console.log(`    ${r.cartons.toString().padStart(5)}  ${r.item}`))
    } else {
      const clean = rows.map(r => ({ date: r.date || '', invoiceNo: String(r.invoiceNo || ''), salespersonAr: r.salespersonAr || 'غير محدد', salespersonEn: SALES_EN[r.salespersonAr] || 'Unassigned', client: r.client || '', amount: num(r.amount), ageDays: num(r.ageDays) })).filter(r => r.client && r.amount)
      if (clean.length) {
        const out = { asOf, source: pdf.body, ocr: true, rows: clean }
        fs.writeFileSync(path.join(dataDir, 'credit.generated.json'), JSON.stringify(out, null, 2) + '\n')
        console.log(`✓ credit (OCR): ${clean.length} invoices, total ${clean.reduce((s, r) => s + r.amount, 0).toFixed(2)} (as of ${asOf})`)
      } else console.log('• credit: OCR produced no rows (kept current)')
    }
  }
  console.log('\nDone. Review, then commit + push to deploy.')
}
main().catch(e => { console.error(e); process.exit(1) })
