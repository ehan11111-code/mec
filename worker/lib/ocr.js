// Google Vision OCR (positional) + deterministic parse of Tarek's المخزون (inventory) / المديونية (credit)
// statements. The PDFs use a custom-encoded Arabic font, so embedded-text extraction misreads them — Vision
// reads the rendered table correctly. Shared by the worker and the local fallback. (Mirrors the proven
// logic in scripts/ocr-statement.js so there is one implementation.)
const num = (v) => { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, '')); return Number.isFinite(n) ? n : 0 }

// PDF (or image) buffer → table rows reconstructed by y then x (RTL), returned as plain strings.
async function ocrRows(VKEY, buf, mime = 'application/pdf') {
  const isPdf = (mime || '').includes('pdf') || buf.subarray(0, 4).toString('latin1').startsWith('%PDF')
  const body = isPdf
    ? { requests: [{ inputConfig: { content: buf.toString('base64'), mimeType: 'application/pdf' }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], pages: [1, 2, 3, 4, 5] }] }
    : { requests: [{ image: { content: buf.toString('base64') }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }] }
  const endpoint = isPdf ? 'files:annotate' : 'images:annotate'
  const r = await fetch(`https://vision.googleapis.com/v1/${endpoint}?key=${VKEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  })
  const j = await r.json()
  if (j.error || j.responses?.[0]?.error) throw new Error(JSON.stringify(j.error || j.responses[0].error).slice(0, 200))
  const lines = []
  // Image responses are flat; PDF responses nest one level under responses[0].responses.
  const pageResponses = isPdf ? (j.responses[0].responses || []) : (j.responses || [])
  for (const resp of pageResponses) {
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

// Deterministic inventory parse: [عاصمة الدجاج] <product> <cartons>. Skip header + الإجمالي subtotals.
function parseInventory(lines) {
  const out = []
  for (const line of lines) {
    const toks = line.split(/\s+/).filter(Boolean)
    if (toks.length < 2) continue
    if (toks.includes('الصنف') || toks.includes('بالكرتون') || toks.includes('كجم')) continue
    if (toks[0] === 'الإجمالي') continue
    const last = toks[toks.length - 1]
    if (!/^\d[\d.,]*$/.test(last)) continue
    const cartons = num(last)
    let words = toks.slice(0, -1)
    if (words[0] === 'عاصمة' && words[1] === 'الدجاج') words = words.slice(2)
    const item = words.join(' ').replace(/\s+/g, ' ').trim()
    if (item && cartons) out.push({ item, cartons, supplier: 'عاصمة الدجاج' })
  }
  return out
}

const SALES_EN = { 'محمود': 'Mahmoud', 'تامر': 'Tamer', 'عمرو': 'Amr' }

// Credit table is messier → let GPT structure the OCR rows.
async function gptCredit(OKEY, ocrText) {
  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  const prompt = `This is an accounts-receivable statement (المديونية). Extract each invoice row: date (YYYY-MM-DD), invoice number, client name, salesperson (Arabic), outstanding amount (VAT-inclusive), and age in days if present. Skip totals/header. Return STRICT JSON {"rows":[{"date":"","invoiceNo":"","client":"","salespersonAr":"","amount":<n>,"ageDays":<n>}]}.`
  const { default: OpenAI } = await import('openai')
  const client = new OpenAI({ apiKey: OKEY })
  const c = await client.chat.completions.create({
    model, temperature: 0, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'OCR rows (RTL):\n' + ocrText }]
  })
  const rows = JSON.parse(c.choices[0]?.message?.content || '{}').rows || []
  return rows.map(r => ({
    date: r.date || '', invoiceNo: String(r.invoiceNo || ''),
    salespersonAr: r.salespersonAr || 'غير محدد', salespersonEn: SALES_EN[r.salespersonAr] || 'Unassigned',
    client: r.client || '', amount: num(r.amount), ageDays: num(r.ageDays),
  })).filter(r => r.client && r.amount)
}

// Derive a statement's as-of date from the filename/body (…حتي تاريخ DD-MM-YYYY.pdf), else received date.
const asOfFrom = (text, received) => { const m = /(\d{2})-(\d{2})-(\d{4})/.exec(text || ''); return m ? `${m[3]}-${m[2]}-${m[1]}` : (received || '').slice(0, 10) }

// Statement kind from filename/caption text (المخزون = inventory, المديونية = credit), else null.
function statementKind(text) {
  const t = String(text || '')
  if (/مخزون|inventory|stock|جرد/i.test(t)) return 'inventory'
  if (/مديونية|مديوني|receivable|ذمم|credit|كشف حساب/i.test(t)) return 'credit'
  return null
}

async function extractStatement(VKEY, OKEY, kind, buf, mime, asOf) {
  const ocr = await ocrRows(VKEY, buf, mime)
  const rows = kind === 'inventory' ? parseInventory(ocr) : await gptCredit(OKEY, ocr.join('\n'))
  return { rows, asOf }
}

module.exports = { ocrRows, parseInventory, gptCredit, extractStatement, asOfFrom, statementKind, num }
