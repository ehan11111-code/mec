// Self-contained importer: reads the 3 quarterly .xlsx workbooks directly (minimal ZIP reader +
// sharedStrings/sheet XML parse), cleans the rows, categorises Arabic product names, and writes
// lib/data/sales.ts and lib/data/purchases.ts. Re-run with: node DATA/_salesgen.js
const fs = require('fs'), path = require('path'), zlib = require('zlib')

// ── minimal ZIP reader (central directory) ──
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
function readShared(entries) {
  const b = entries['xl/sharedStrings.xml']; if (!b) return []
  const x = b.toString('utf8'); const out = []
  const re = /<si>([\s\S]*?)<\/si>/g; let m
  while (m = re.exec(x)) { const parts = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(a => a[1]); out.push(decode(parts.join(''))) }
  return out
}
function decode(s) { return String(s).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'") }
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
// Valid serials only (≈ 2023-03 … 2028-08); filters invoice numbers leaking into the date column.
function serialToISO(serial) { const n = num(serial); if (n < 45000 || n > 47000) return ''; const ms = Date.UTC(1899, 11, 30) + n * 86400000; return new Date(ms).toISOString().slice(0, 10) }
function monthKey(iso) { return iso ? iso.slice(0, 7) : '' }

// ── product categoriser (mirror of lib/data/categorize.ts — keep in sync) ──
const CAT_AR = { Poultry: 'دواجن', Beef: 'لحوم بقري', Lamb: 'لحوم غنم', Processed: 'منتجات مصنّعة', Dairy: 'أجبان وألبان', Vegetables: 'خضروات', Other: 'أخرى' }
function categorize(itemRaw) {
  const s = String(itemRaw || '')
  let category = 'Other'
  if (/دجاج|صدور|صدر|ارجل|أرجل|اجنحة|أجنحة|فيل ليج|ليجز|ورك|أوراك|افخاذ|كبد دجاج|شاورما دجاج/.test(s)) category = 'Poultry'
  else if (/خروف|غنم|ضأن|ضاني|حري|موزات/.test(s)) category = 'Lamb'
  else if (/جبن|جبنة|زبد|زبدة|لبن|حليب|قشطة|كريم/.test(s)) category = 'Dairy'
  else if (/شاورما|برجر|برغر|كباب|كفتة|ناجت|نقانق|مرتديلا|هوت دوج|سجق|كبة/.test(s)) category = 'Processed'
  else if (/بطاطس|خضار|خضروات|بصل|طماطم|فلفل|بازلاء|جزر/.test(s)) category = 'Vegetables'
  else if (/توب سايد|سلفر سايد|فور كوارتر|فور كورتر|فوركوارتر|كوارتر|تندر ليون|تندرليون|رامب|ستيك|فلانك|ثك فلانك|فيليه|فخدة|فخذ|عجل|بقر|بقري|لحم|رول|سلايس|بوبي فيل|تمام|نخاع|كبدة|ريش|عصب/.test(s)) category = 'Beef'
  else if (s.trim().length > 0) category = 'Beef'
  let origin = '', originAr = ''
  if (/هندي|الهند/.test(s)) { origin = 'India'; originAr = 'الهند' }
  else if (/برازيلي|البرازيل/.test(s)) { origin = 'Brazil'; originAr = 'البرازيل' }
  else if (/استرالي|أسترالي/.test(s)) { origin = 'Australia'; originAr = 'أستراليا' }
  else if (/روسي|روسيا/.test(s)) { origin = 'Russia'; originAr = 'روسيا' }
  else if (/فرنسي|فرنسا/.test(s)) { origin = 'France'; originAr = 'فرنسا' }
  return { category, catAr: CAT_AR[category], origin, originAr }
}

const REP_EN = { 'محمود': 'Mahmoud', 'عمرو': 'Amr', 'تامر': 'Tamer', 'عام': 'Unassigned', 'غير محدد': 'Unassigned', 'أبو خالد': 'Abu Khalid', 'محمد': 'Mohammed' }
function repEn(ar) { return REP_EN[ar] || (ar || 'Unassigned') }
const locale_unspecified = 'عميل نقدي / غير محدد'  // blank client cell → labelled cash/unspecified
function isJunk(s) { return /اجمالي|الاجمالي|إجمالي|المجموع|الضريبة المستحقة|ضريبة مشتريات|اجمالى/.test(String(s || '')) }

// header text → column index (match by keyword, robust to suffixes & column shifts)
function headerMap(headerRow) { const m = {}; for (const [k, v] of Object.entries(headerRow.cells)) m[parseInt(k)] = String(v); return m }
function findCol(hm, test) { for (const [k, v] of Object.entries(hm)) if (test(v)) return parseInt(k); return -1 }

function esc(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ').trim() }

const FILES = ['مبيعات الربع الرابع 2025.xlsx', 'مبيعات الربع الاول 2026.xlsx', 'مبيعات الربع الثاني 2026.xlsx']
const sales = [], purchases = []
let salesSeq = 1, purchSeq = 1

for (const fname of FILES) {
  const entries = readZip(fs.readFileSync(path.join(__dirname, fname)))
  const shared = readShared(entries)
  const sheetFiles = Object.keys(entries).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
  for (const sf of sheetFiles) {
    const rows = parseSheet(entries[sf], shared)
    const titleRow = rows.find(r => r.r === 1); const headerRow = rows.find(r => r.r === 2)
    if (!headerRow) continue
    const title = titleRow ? Object.values(titleRow.cells).join(' ') : ''
    const hm = headerMap(headerRow)
    const isPurch = /المشتريات/.test(title) || findCol(hm, v => /المورد/.test(v)) > -1

    if (isPurch) {
      const cDate = findCol(hm, v => /التاريخ/.test(v))
      const cInv = findCol(hm, v => /رقم الفاتورة/.test(v))
      const cSup = findCol(hm, v => /المورد/.test(v))
      const cItem = findCol(hm, v => /البيان/.test(v))
      const cUnit = findCol(hm, v => /الوحدة/.test(v))
      const cCart = findCol(hm, v => /العدد بالكرتون/.test(v))
      const cCost = findCol(hm, v => /سعر الوحدة/.test(v))
      const cQty = findCol(hm, v => /الكمية/.test(v))
      const cPre = findCol(hm, v => /قبل الضريبة/.test(v))
      const cVat = findCol(hm, v => v === 'الضريبة')
      const cPost = findCol(hm, v => /بعد الضريبة/.test(v))
      const cPaid = findCol(hm, v => /المسدد/.test(v))
      const cRem = findCol(hm, v => /باقي/.test(v))
      const cDwell = findCol(hm, v => /مدة بقاء/.test(v))
      for (const row of rows) {
        if (row.r <= 2) continue
        const c = row.cells; const sup = c[cSup]
        if (!sup || isJunk(sup) || isJunk(c[cItem])) continue
        const post = num(c[cPost]); if (!post) continue
        let dwell = num(c[cDwell]); if (dwell < 0 || dwell > 365) dwell = 0
        const cat = categorize(c[cItem])
        purchases.push({
          id: 'P-' + (purchSeq++), date: serialToISO(c[cDate]), invoiceNo: esc(c[cInv]), supplier: esc(sup),
          item: esc(c[cItem]), category: cat.category, categoryAr: cat.catAr, unit: esc(c[cUnit]),
          cartons: num(c[cCart]), unitCost: num(c[cCost]), qtyIn: num(c[cQty]),
          preVat: Math.round(num(c[cPre])), vat: Math.round(num(c[cVat])), postVat: Math.round(post),
          paid: Math.round(num(c[cPaid])), remaining: Math.round(num(c[cRem])), dwellDays: dwell
        })
      }
    } else {
      const cDate = findCol(hm, v => /التاريخ/.test(v))
      const cInv = findCol(hm, v => /رقم الفاتورة/.test(v))
      const cRep = findCol(hm, v => /المندوب/.test(v))
      const cClient = findCol(hm, v => /اسم العميل/.test(v))
      const cItem = findCol(hm, v => /بيان الصنف/.test(v))
      const cCart = findCol(hm, v => /العدد بالكرتون/.test(v))
      const cPrice = findCol(hm, v => /سعر الوحدة/.test(v))
      const cQty = findCol(hm, v => /الكمية/.test(v))
      const cPre = findCol(hm, v => /قبل الضريبة/.test(v))
      const cVat = findCol(hm, v => v === 'الضريبة')
      const cPost = findCol(hm, v => /بعد الضريبة/.test(v))
      const cColl = findCol(hm, v => /حالة التحصيل/.test(v))
      const cPay = findCol(hm, v => /كاش/.test(v))
      for (const row of rows) {
        if (row.r <= 2) continue
        const c = row.cells; const client = (c[cClient] || '').trim(); const item = (c[cItem] || '').trim()
        const post = num(c[cPost]); if (!post) continue
        const inv = (c[cInv] || '').trim(); const iso = serialToISO(c[cDate])
        // Drop subtotal/total rows: no item (or "0"), or no invoice AND no date — these are sheet sums.
        if (!item || item === '0') continue
        if (!inv && !iso) continue
        if (isJunk(client) || isJunk(item)) continue
        const repRaw = (c[cRep] || '').trim()
        // 'مرتجع' (return marker) and 'عام' (generic) are not real salespeople → unassigned bucket.
        const repAr = (repRaw && !/^\d+$/.test(repRaw) && !/مرتجع|^عام$/.test(repRaw)) ? repRaw : 'غير محدد'
        const coll = String(c[cColl] || '')
        const collected = /تم/.test(coll) && !/مرتجع/.test(coll)
        const cat = categorize(item)
        // Real cash sales sometimes have a blank client cell → label clearly, never leave empty.
        const clientName = client && !isJunk(client) ? client : (locale_unspecified)
        sales.push({
          id: 'S-' + (salesSeq++), date: iso, month: monthKey(iso), invoiceNo: esc(inv),
          salespersonAr: esc(repAr), salespersonEn: repEn(repAr), clientName: esc(clientName),
          item: esc(item), category: cat.category, categoryAr: cat.catAr, origin: cat.origin, originAr: cat.originAr,
          cartons: num(c[cCart]), unitPrice: num(c[cPrice]), qty: num(c[cQty]),
          preVat: Math.round(num(c[cPre])), vat: Math.round(num(c[cVat])), postVat: Math.round(post),
          collected, collectionStatus: esc(coll), payMethod: esc(c[cPay])
        })
      }
    }
  }
}

// Dedupe (the Q2 purchase sheet repeats Q1 rows; guard sales too), then reindex ids.
function dedupe(rows, keyFn) { const seen = new Set(); const out = []; for (const r of rows) { const k = keyFn(r); if (seen.has(k)) continue; seen.add(k); out.push(r) } return out }
{
  const sB = sales.length, pB = purchases.length
  const su = dedupe(sales, r => `${r.date}|${r.invoiceNo}|${r.clientName}|${r.item}|${r.postVat}`)
  const pu = dedupe(purchases, r => `${r.date}|${r.invoiceNo}|${r.supplier}|${r.item}|${r.postVat}`)
  sales.length = 0; sales.push(...su); purchases.length = 0; purchases.push(...pu)
  sales.forEach((r, i) => r.id = 'S-' + (i + 1)); purchases.forEach((r, i) => r.id = 'P-' + (i + 1))
  console.log('dedupe sales', sB, '->', sales.length, '· purchases', pB, '->', purchases.length)
}

function writeTs(file, header, type, rows, fields) {
  const body = rows.map(r => '  { ' + fields.map(f => {
    const v = r[f.k]
    if (f.t === 's') return `${f.k}: '${esc(v)}'`
    if (f.t === 'b') return `${f.k}: ${v ? 'true' : 'false'}`
    return `${f.k}: ${v || 0}`
  }).join(', ') + ' },').join('\n')
  fs.writeFileSync(file, header + '\nexport type ' + type + '\n\nexport const ' + (file.includes('sales') ? 'sales' : 'purchases') + ': ' + type.split(' ')[0] + '[] = [\n' + body + '\n]\n', 'utf8')
}

const outDir = path.join(__dirname, '..', 'lib', 'data')
fs.mkdirSync(outDir, { recursive: true })

writeTs(path.join(outDir, 'sales.ts'),
  `// AUTO-GENERATED from the 3 quarterly sales workbooks (DATA/مبيعات*.xlsx). Real MEC invoice lines,\n// Oct 2025 → Jun 2026. Regenerate: node DATA/_salesgen.js`,
  `SalesInvoice = { id: string; date: string; month: string; invoiceNo: string; salespersonAr: string; salespersonEn: string; clientName: string; item: string; category: string; categoryAr: string; origin: string; originAr: string; cartons: number; unitPrice: number; qty: number; preVat: number; vat: number; postVat: number; collected: boolean; collectionStatus: string; payMethod: string }`,
  sales,
  [{ k: 'id', t: 's' }, { k: 'date', t: 's' }, { k: 'month', t: 's' }, { k: 'invoiceNo', t: 's' }, { k: 'salespersonAr', t: 's' }, { k: 'salespersonEn', t: 's' }, { k: 'clientName', t: 's' }, { k: 'item', t: 's' }, { k: 'category', t: 's' }, { k: 'categoryAr', t: 's' }, { k: 'origin', t: 's' }, { k: 'originAr', t: 's' }, { k: 'cartons', t: 'n' }, { k: 'unitPrice', t: 'n' }, { k: 'qty', t: 'n' }, { k: 'preVat', t: 'n' }, { k: 'vat', t: 'n' }, { k: 'postVat', t: 'n' }, { k: 'collected', t: 'b' }, { k: 'collectionStatus', t: 's' }, { k: 'payMethod', t: 's' }])

writeTs(path.join(outDir, 'purchases.ts'),
  `// AUTO-GENERATED from the 3 quarterly purchase sheets (المشتريات in DATA/مبيعات*.xlsx). Real MEC\n// procurement lines. Regenerate: node DATA/_salesgen.js`,
  `PurchaseRow = { id: string; date: string; invoiceNo: string; supplier: string; item: string; category: string; categoryAr: string; unit: string; cartons: number; unitCost: number; qtyIn: number; preVat: number; vat: number; postVat: number; paid: number; remaining: number; dwellDays: number }`,
  purchases,
  [{ k: 'id', t: 's' }, { k: 'date', t: 's' }, { k: 'invoiceNo', t: 's' }, { k: 'supplier', t: 's' }, { k: 'item', t: 's' }, { k: 'category', t: 's' }, { k: 'categoryAr', t: 's' }, { k: 'unit', t: 's' }, { k: 'cartons', t: 'n' }, { k: 'unitCost', t: 'n' }, { k: 'qtyIn', t: 'n' }, { k: 'preVat', t: 'n' }, { k: 'vat', t: 'n' }, { k: 'postVat', t: 'n' }, { k: 'paid', t: 'n' }, { k: 'remaining', t: 'n' }, { k: 'dwellDays', t: 'n' }])

const sRev = sales.reduce((s, r) => s + r.postVat, 0), pSpend = purchases.reduce((s, r) => s + r.postVat, 0)
console.log('WROTE sales.ts:', sales.length, 'invoices · revenue', Math.round(sRev).toLocaleString())
console.log('WROTE purchases.ts:', purchases.length, 'lines · spend', Math.round(pSpend).toLocaleString(), '· outstanding', purchases.reduce((s, r) => s + r.remaining, 0).toLocaleString())
console.log('sales categories:', JSON.stringify([...new Set(sales.map(s => s.category))]))
console.log('months:', JSON.stringify([...new Set(sales.map(s => s.month))].sort()))
console.log('salespeople:', JSON.stringify([...new Set(sales.map(s => s.salespersonAr))]))
