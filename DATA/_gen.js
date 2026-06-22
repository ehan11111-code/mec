const fs = require('fs')
const path = require('path')
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '_clients.json'), 'utf8'))
const rows = data.rows

// Field coverage stats
const cov = {}
for (let c = 1; c <= 13; c++) cov[c] = rows.filter(r => r[c] && r[c].length).length
console.log('coverage by col:', JSON.stringify(cov))
console.log('type values:', JSON.stringify([...new Set(rows.map(r => r[7]).filter(Boolean))]))
console.log('source values:', JSON.stringify([...new Set(rows.map(r => r[6]).filter(Boolean))]))
console.log('active values:', JSON.stringify([...new Set(rows.map(r => r[12]).filter(Boolean))]))
console.log('branch values:', JSON.stringify([...new Set(rows.map(r => r[5]).filter(Boolean))].slice(0, 5)))
console.log('salesperson values:', JSON.stringify([...new Set(rows.map(r => r[4]).filter(Boolean))].slice(0, 10)))
console.log('location sample:', JSON.stringify(rows.map(r => r[11]).filter(Boolean).slice(0, 5)))

// Deterministic PRNG keyed by client id
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 } return h }
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }

const CITIES = [['الرياض', 'Riyadh'], ['جدة', 'Jeddah'], ['الدمام', 'Dammam'], ['مكة المكرمة', 'Mecca'], ['المدينة المنورة', 'Medina'], ['الخبر', 'Khobar'], ['الطائف', 'Taif'], ['بريدة', 'Buraidah'], ['تبوك', 'Tabuk'], ['أبها', 'Abha']]
// Real reps that appear in the sheet — used for clients with no salesperson assigned
const REPS = [['عمرو المغربي', 'Amr Al-Maghrabi'], ['محمود سلامة', 'Mahmoud Salama']]

function esc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'") }

const clients = rows.map(r => {
  const id = r[1] || ''
  const rnd = rng(hash(id))
  const active = (r[12] || '').includes('نعم')
  const nameAr = r[2] || r[3] || id
  const nameEn = r[3] || r[2] || id
  const city = CITIES[Math.floor(rnd() * CITIES.length)]
  const repEnMap = { 'عمرو المغربي': 'Amr Al-Maghrabi', 'محمود سلامة': 'Mahmoud Salama' }
  const rep = r[4] && r[4].length ? [r[4], repEnMap[r[4]] || r[4]] : REPS[Math.floor(rnd() * REPS.length)]
  // derived demo metrics (documented in DATA.md) — real sheet lacks revenue/risk/orders
  const totalOrders = active ? Math.floor(rnd() * 60) + 2 : Math.floor(rnd() * 4)
  const avgOrder = 4000 + Math.floor(rnd() * 26000)
  const totalRevenue = totalOrders * avgOrder
  const overdue = rnd() < 0.28 ? Math.floor(rnd() * 90000) : 0
  const risk = Math.min(95, Math.round((overdue > 0 ? 35 : 8) + rnd() * 45))
  const status = !active ? 'inactive' : totalOrders < 5 ? 'lead' : 'active'
  const terms = [7, 14, 30, 30, 45][Math.floor(rnd() * 5)]
  return {
    id, nameAr, nameEn, salespersonAr: rep[0], salespersonEn: rep[1],
    branch: r[5] || '', source: r[6] || '', type: r[7] || '', mobile: r[8] || '',
    crNumber: r[9] || '', accountNumber: r[10] || '', cityAr: city[0], cityEn: city[1],
    active, status, riskScore: risk, totalOrders, totalRevenue, overdueAmount: overdue, paymentTermsDays: terms
  }
})

const ts = `// AUTO-GENERATED from DATA/بيانات العملاء.xlsx (112 real MEC clients).
// Real fields (id, names, branch, source, type, mobile, crNumber, accountNumber, active) come from the
// client's ERP export. Derived demo metrics (salesperson, city, status, riskScore, totalOrders,
// totalRevenue, overdueAmount, paymentTermsDays) are deterministic placeholders until real
// order/payment data arrives — see DATA.md. Regenerate via DATA/_gen.js.

export type Client = {
  id: string; nameAr: string; nameEn: string; salespersonAr: string; salespersonEn: string
  branch: string; source: string; type: string; mobile: string; crNumber: string; accountNumber: string
  cityAr: string; cityEn: string; active: boolean
  status: 'active' | 'lead' | 'inactive'; riskScore: number; totalOrders: number
  totalRevenue: number; overdueAmount: number; paymentTermsDays: number
}

export const clients: Client[] = [
${clients.map(c => `  { id: '${esc(c.id)}', nameAr: '${esc(c.nameAr)}', nameEn: '${esc(c.nameEn)}', salespersonAr: '${esc(c.salespersonAr)}', salespersonEn: '${esc(c.salespersonEn)}', branch: '${esc(c.branch)}', source: '${esc(c.source)}', type: '${esc(c.type)}', mobile: '${esc(c.mobile)}', crNumber: '${esc(c.crNumber)}', accountNumber: '${esc(c.accountNumber)}', cityAr: '${esc(c.cityAr)}', cityEn: '${esc(c.cityEn)}', active: ${c.active}, status: '${c.status}', riskScore: ${c.riskScore}, totalOrders: ${c.totalOrders}, totalRevenue: ${c.totalRevenue}, overdueAmount: ${c.overdueAmount}, paymentTermsDays: ${c.paymentTermsDays} },`).join('\n')}
]
`
const outDir = path.join(__dirname, '..', 'lib', 'data')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'clients.ts'), ts, 'utf8')
console.log('WROTE lib/data/clients.ts with', clients.length, 'clients')
console.log('active:', clients.filter(c => c.active).length, ' withOverdue:', clients.filter(c => c.overdueAmount > 0).length)
