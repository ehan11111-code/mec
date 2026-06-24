// Self-contained importer for the warehouse stock ledger. Reads المخزون 2026.xlsx (a real in/out
// movement ledger: positive rows = stock received, negative rows with a client = issued/sold), nets each
// product column to current cartons on hand, and pulls unit/barcode from تقارير الاصناف.xlsx (the
// products report — its PRICES are inaccurate, so we ignore them; cost always comes from procurement).
// Writes lib/data/inventory.ts. Re-run: node DATA/_inventorygen.js
const fs = require('fs'), path = require('path'), zlib = require('zlib')

function readZip(buf) {
  let eo = buf.length - 22
  while (eo >= 0 && buf.readUInt32LE(eo) !== 0x06054b50) eo--
  const cdOffset = buf.readUInt32LE(eo + 16), cdCount = buf.readUInt16LE(eo + 10)
  const entries = {}; let p = cdOffset
  for (let i = 0; i < cdCount; i++) {
    const method = buf.readUInt16LE(p + 10), compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    const lhNameLen = buf.readUInt16LE(localOffset + 26), lhExtraLen = buf.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + lhNameLen + lhExtraLen
    const raw = buf.subarray(dataStart, dataStart + compSize)
    entries[name] = method === 0 ? raw : zlib.inflateRawSync(raw)
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}
function decode(s) { return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'") }
function readShared(e) { const b = e['xl/sharedStrings.xml']; if (!b) return []; const x = b.toString('utf8'); const out = []; const re = /<si>([\s\S]*?)<\/si>/g; let m; while (m = re.exec(x)) { const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(a => a[1]); out.push(decode(parts.join(''))) } return out }
function colNum(c) { let n = 0; for (const ch of c) n = n * 26 + (ch.charCodeAt(0) - 64); return n }
function parseSheet(buf, shared) {
  const x = buf.toString('utf8'); const rows = []
  const rre = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g; let rm
  while (rm = rre.exec(x)) {
    const rn = parseInt(rm[1]); const cells = {}
    const cre = /<c[^>]*r="([A-Z]+)\d+"([^>]*?)>([\s\S]*?)<\/c>/g; let cm
    while (cm = cre.exec(rm[2])) {
      const col = colNum(cm[1]); const isShared = /t="s"/.test(cm[2])
      const vM = cm[3].match(/<v>([\s\S]*?)<\/v>/); const isM = cm[3].match(/<t[^>]*>([\s\S]*?)<\/t>/)
      let v = ''; if (isShared && vM) v = shared[parseInt(vM[1])] || ''; else if (isM) v = decode(isM[1]); else if (vM) v = vM[1]
      cells[col] = String(v).trim()
    }
    rows.push({ r: rn, cells })
  }
  return rows
}
const num = s => { const n = parseFloat(String(s == null ? '' : s).replace(/,/g, '')); return isNaN(n) ? 0 : n }
function serialToISO(serial) { const n = num(serial); if (n < 45000 || n > 47000) return ''; const ms = Date.UTC(1899, 11, 30) + n * 86400000; return new Date(ms).toISOString().slice(0, 10) }
const norm = s => String(s || '').replace(/[ـ]/g, '').replace(/[.،,*()]/g, ' ').replace(/\s+/g, ' ').trim()
function esc(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ').trim() }

// categoriser (mirror of lib/data/categorize.ts)
const CAT_AR = { Poultry: 'دواجن', Beef: 'لحوم بقري', Lamb: 'لحوم غنم', Processed: 'منتجات مصنّعة', Dairy: 'أجبان وألبان', Vegetables: 'خضروات', Other: 'أخرى' }
function categorize(s0) {
  const s = String(s0 || '')
  let c = 'Other'
  if (/دجاج|صدور|صدر|ارجل|أرجل|اجنحة|أجنحة|فيل ليج|ليجز|ورك|أوراك|افخاذ|كبد دجاج|شاورما دجاج/.test(s)) c = 'Poultry'
  else if (/خروف|غنم|ضأن|ضاني|حري|موزات|كرشة/.test(s)) c = 'Lamb'
  else if (/جبن|جبنة|زبد|زبدة|لبن|حليب|قشطة|كريم/.test(s)) c = 'Dairy'
  else if (/شاورما|برجر|برغر|كباب|كفتة|ناجت|نقانق|مرتديلا|هوت دوج|سجق|كبة/.test(s)) c = 'Processed'
  else if (/بطاطس|خضار|خضروات|بصل|طماطم|فلفل|بازلاء|جزر|مانجو|جوافة/.test(s)) c = 'Vegetables'
  else if (/سمك|بنجش/.test(s)) c = 'Other'
  else if (/توب سايد|سلفر سايد|سيلفر|فور كوارتر|كوارتر|تندر ليون|تندرليون|تندر لاين|رامب|ستيك|فلانك|فيليه|فخدة|فخذ|عجل|بقر|بقري|لحم|رول|سلايس|بوبي فيل|تمام|نخاع|كبدة|ريش|عصب/.test(s)) c = 'Beef'
  else if (s.trim().length > 0) c = 'Beef'
  return { category: c, catAr: CAT_AR[c] }
}

const META = /^(التاريخ|رقم الفاتورة|البيان|العدد بالكرتون|الوزن بالكيلو)$/

// ── products report → unit + barcode per item (prices ignored) ──
function readProductsReport() {
  const e = readZip(fs.readFileSync(path.join(__dirname, 'تقارير الاصناف.xlsx')))
  const shared = readShared(e)
  const sf = Object.keys(e).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0]
  const rows = parseSheet(e[sf], shared)
  const map = new Map()  // norm(name) -> {unit, barcode}
  for (const row of rows) {
    if (row.r <= 1) continue
    const c = row.cells
    const name = c[2]; if (!name) continue           // detail rows have col2 = item name
    map.set(norm(name), { unit: c[3] || '', barcode: c[9] && c[9] !== '0' ? c[9] : '' })
  }
  return map
}

// ── 2026 ledger → on-hand + movements per product ──
function readLedger(fname) {
  const e = readZip(fs.readFileSync(path.join(__dirname, fname)))
  const shared = readShared(e)
  const sf = Object.keys(e).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0]
  const rows = parseSheet(e[sf], shared)
  const header = rows.find(r => r.r === 3); if (!header) return { items: new Map(), months: new Set() }
  const prodCols = {}                                // col -> product name
  for (const [k, v] of Object.entries(header.cells)) { const n = String(v).trim(); if (n && !META.test(n)) prodCols[k] = n }
  const items = new Map()                            // name -> agg
  const months = new Set()
  for (const r of rows) {
    if (r.r <= 3) continue
    const date = serialToISO(r.cells[1])
    if (date) months.add(date.slice(0, 7))
    for (const [k, name] of Object.entries(prodCols)) {
      const val = num(r.cells[k]); if (!val) continue
      const a = items.get(name) || { net: 0, inbound: 0, outbound: 0, lastIn: '', lastMove: '' }
      a.net += val
      if (val > 0) { a.inbound += val; if (date > a.lastIn) a.lastIn = date }
      else a.outbound += -val
      if (date > a.lastMove) a.lastMove = date
      items.set(name, a)
    }
  }
  return { items, months }
}

const products = readProductsReport()
const { items, months } = readLedger('المخزون 2026.xlsx')

const rows = []
for (const [name, a] of items.entries()) {
  const { category, catAr } = categorize(name)
  const meta = products.get(norm(name)) || {}
  rows.push({
    item: name, category, categoryAr: catAr,
    onHand: Math.max(0, Math.round(a.net)), rawNet: Math.round(a.net),
    inbound: Math.round(a.inbound), outbound: Math.round(a.outbound),
    lastIn: a.lastIn, lastMove: a.lastMove,
    unit: meta.unit || 'كرتون', barcode: meta.barcode || ''
  })
}
rows.sort((x, y) => y.onHand - x.onHand)

const monthsArr = [...months].sort()
const out = `// AUTO-GENERATED from DATA/المخزون 2026.xlsx (warehouse in/out ledger) + DATA/تقارير الاصناف.xlsx
// (units/barcodes only — its prices are inaccurate; cost comes from procurement). On hand = net of all
// recorded movements per product in the 2026 ledger (received − issued). Regenerate: node DATA/_inventorygen.js
export type InventoryRow = { item: string; category: string; categoryAr: string; onHand: number; rawNet: number; inbound: number; outbound: number; lastIn: string; lastMove: string; unit: string; barcode: string }

export const INVENTORY_MONTHS: string[] = ${JSON.stringify(monthsArr)}
export const inventory: InventoryRow[] = [
${rows.map(r => `  { item: '${esc(r.item)}', category: '${r.category}', categoryAr: '${esc(r.categoryAr)}', onHand: ${r.onHand}, rawNet: ${r.rawNet}, inbound: ${r.inbound}, outbound: ${r.outbound}, lastIn: '${r.lastIn}', lastMove: '${r.lastMove}', unit: '${esc(r.unit)}', barcode: '${esc(r.barcode)}' }`).join(',\n')}
]
`
fs.writeFileSync(path.join(__dirname, '..', 'lib', 'data', 'inventory.ts'), out)
console.log(`Wrote lib/data/inventory.ts — ${rows.length} SKUs, months ${monthsArr.join(', ')}.`)
console.log(`On-hand total: ${rows.reduce((a, r) => a + r.onHand, 0)} cartons · negative-net SKUs (data gaps): ${rows.filter(r => r.rawNet < 0).length}`)
console.log('Top 5:', rows.slice(0, 5).map(r => `${r.item.slice(0, 20)}=${r.onHand}`).join(' · '))