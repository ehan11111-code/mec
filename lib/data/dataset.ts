import { clients as rawClients, type Client } from './clients'
import { sales, type SalesInvoice } from './sales'
import { purchases, type PurchaseRow } from './purchases'
import { categoryLabel } from './categorize'

export type { Client, SalesInvoice, PurchaseRow }

// ── formatting / helpers ──
// Full comma-grouped figures (e.g. "SAR 31,084,511") — millions must read as millions.
export const fmtSAR = (n: number) => `SAR ${Math.round(n).toLocaleString('en-US')}`
// Compact form for chart axis ticks only (keeps the Y-axis narrow so labels aren't clipped).
export const fmtSARcompact = (n: number) => {
  const a = Math.abs(n)
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (a >= 1000) return `${Math.round(n / 1000)}K`
  return String(Math.round(n))
}
export const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US')
export const clientName = (c: Client, locale: 'en' | 'ar') => (locale === 'ar' ? c.nameAr : c.nameEn)
export { categoryLabel }
const norm = (s: string) => String(s || '').replace(/[ـ]/g, '').replace(/[.،,]/g, '').replace(/\s+/g, ' ').trim()

// Ordered months present in the data (drops the few undated rows).
export const MONTHS = Array.from(new Set(sales.map(s => s.month).filter(Boolean))).sort()
const MONTH_AR: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل', '05': 'مايو', '06': 'يونيو',
  '07': 'يوليو', '08': 'أغسطس', '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر'
}
const MONTH_EN: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
}
export function monthLabel(m: string, locale: 'en' | 'ar') {
  const mm = m.slice(5, 7); const yy = m.slice(2, 4)
  return locale === 'ar' ? `${MONTH_AR[mm] ?? m} ${yy}` : `${MONTH_EN[mm] ?? m} ${yy}`
}

// ── raw accessors ──
export function getSales(): SalesInvoice[] { return sales }
export function getPurchases(): PurchaseRow[] { return purchases }

// ── sales filter + aggregates ──
export type SalesFilter = { month?: string; salesperson?: string; category?: string }
function applyFilter(rows: SalesInvoice[], f?: SalesFilter): SalesInvoice[] {
  if (!f) return rows
  return rows.filter(r =>
    (!f.month || r.month === f.month) &&
    (!f.salesperson || r.salespersonAr === f.salesperson) &&
    (!f.category || r.category === f.category))
}
export function salesSummary(f?: SalesFilter) {
  const rows = applyFilter(sales, f)
  const revenue = rows.reduce((s, r) => s + r.postVat, 0)
  const preVat = rows.reduce((s, r) => s + r.preVat, 0)
  const vat = rows.reduce((s, r) => s + r.vat, 0)
  const collected = rows.filter(r => r.collected).reduce((s, r) => s + r.postVat, 0)
  const outstanding = revenue - collected
  const invoices = rows.length
  const clientsCount = new Set(rows.map(r => r.clientName)).size
  return { revenue, preVat, vat, collected, outstanding, invoices, clients: clientsCount, avgInvoice: invoices ? revenue / invoices : 0 }
}
export function salesByMonth(f?: SalesFilter): { key: string; t: string; tAr: string; v: number }[] {
  const map = new Map<string, number>()
  for (const r of applyFilter(sales, f)) { if (!r.month) continue; map.set(r.month, (map.get(r.month) ?? 0) + r.postVat) }
  return MONTHS.filter(m => map.has(m)).map(m => ({ key: m, t: monthLabel(m, 'en'), tAr: monthLabel(m, 'ar'), v: Math.round(map.get(m)! ) }))
}
export function salesBySalesperson(f?: SalesFilter): { ar: string; en: string; v: number; invoices: number }[] {
  const map = new Map<string, { en: string; v: number; n: number }>()
  for (const r of applyFilter(sales, f)) {
    const cur = map.get(r.salespersonAr) ?? { en: r.salespersonEn, v: 0, n: 0 }
    cur.v += r.postVat; cur.n++; map.set(r.salespersonAr, cur)
  }
  return [...map.entries()].map(([ar, v]) => ({ ar, en: v.en, v: Math.round(v.v), invoices: v.n })).sort((a, b) => b.v - a.v)
}
export function salesByCategory(f?: SalesFilter): { key: string; ar: string; en: string; v: number; qty: number }[] {
  const map = new Map<string, { ar: string; v: number; qty: number }>()
  for (const r of applyFilter(sales, f)) {
    const cur = map.get(r.category) ?? { ar: r.categoryAr, v: 0, qty: 0 }
    cur.v += r.postVat; cur.qty += r.qty; map.set(r.category, cur)
  }
  return [...map.entries()].map(([key, v]) => ({ key, ar: v.ar, en: key, v: Math.round(v.v), qty: Math.round(v.qty) })).sort((a, b) => b.v - a.v)
}
export function salesByClientName(f?: SalesFilter): { name: string; revenue: number; invoices: number; collected: number; outstanding: number }[] {
  const map = new Map<string, { revenue: number; n: number; collected: number }>()
  for (const r of applyFilter(sales, f)) {
    const cur = map.get(r.clientName) ?? { revenue: 0, n: 0, collected: 0 }
    cur.revenue += r.postVat; cur.n++; if (r.collected) cur.collected += r.postVat; map.set(r.clientName, cur)
  }
  return [...map.entries()].map(([name, v]) => ({ name, revenue: Math.round(v.revenue), invoices: v.n, collected: Math.round(v.collected), outstanding: Math.round(v.revenue - v.collected) }))
    .sort((a, b) => b.revenue - a.revenue)
}
export function topProducts(f?: SalesFilter, n = 10): { item: string; category: string; revenue: number; qty: number }[] {
  const map = new Map<string, { category: string; revenue: number; qty: number }>()
  for (const r of applyFilter(sales, f)) {
    const cur = map.get(r.item) ?? { category: r.category, revenue: 0, qty: 0 }
    cur.revenue += r.postVat; cur.qty += r.qty; map.set(r.item, cur)
  }
  return [...map.entries()].map(([item, v]) => ({ item, category: v.category, revenue: Math.round(v.revenue), qty: Math.round(v.qty) })).sort((a, b) => b.revenue - a.revenue).slice(0, n)
}
export function collectionsSummary(f?: SalesFilter) {
  const rows = applyFilter(sales, f)
  const collected = rows.filter(r => r.collected)
  const cash = rows.filter(r => /كاش|cash/i.test(r.payMethod)).reduce((s, r) => s + r.postVat, 0)
  const bank = rows.filter(r => /تحويل|بنك|bank/i.test(r.payMethod)).reduce((s, r) => s + r.postVat, 0)
  const collectedV = collected.reduce((s, r) => s + r.postVat, 0)
  const total = rows.reduce((s, r) => s + r.postVat, 0)
  return { collected: collectedV, outstanding: total - collectedV, collectedCount: collected.length, total, cash, bank }
}

// ── purchases aggregates ──
const isSupplierNoise = (s: string) => /ضريبة|اجمالي|إجمالي|المجموع/.test(s)
export function supplierSpend(n = 10): { supplier: string; spend: number; lines: number }[] {
  const map = new Map<string, { spend: number; n: number }>()
  for (const p of purchases) {
    if (isSupplierNoise(p.supplier)) continue
    const cur = map.get(p.supplier) ?? { spend: 0, n: 0 }
    cur.spend += p.postVat; cur.n++; map.set(p.supplier, cur)
  }
  return [...map.entries()].map(([supplier, v]) => ({ supplier, spend: Math.round(v.spend), lines: v.n })).sort((a, b) => b.spend - a.spend).slice(0, n)
}
export function purchasesByCategory(): { key: string; ar: string; en: string; v: number }[] {
  const map = new Map<string, { ar: string; v: number }>()
  for (const p of purchases) {
    if (isSupplierNoise(p.supplier)) continue
    const cur = map.get(p.category) ?? { ar: p.categoryAr, v: 0 }
    cur.v += p.postVat; map.set(p.category, cur)
  }
  return [...map.entries()].map(([key, v]) => ({ key, ar: v.ar, en: key, v: Math.round(v.v) })).sort((a, b) => b.v - a.v)
}
export function procurementSummary() {
  const rows = purchases.filter(p => !isSupplierNoise(p.supplier))
  const spend = rows.reduce((s, p) => s + p.postVat, 0)
  const suppliers = new Set(rows.map(p => p.supplier)).size
  const lines = rows.length
  return { spend, suppliers, lines, avgLine: lines ? spend / lines : 0 }
}

// ── margin: avg sell unit price vs avg buy unit cost per category ──
export function marginByCategory(): { key: string; ar: string; en: string; avgSell: number; avgCost: number; marginPct: number; revenue: number }[] {
  const sell = new Map<string, { ar: string; sum: number; n: number; rev: number }>()
  for (const r of sales) {
    if (r.unitPrice <= 0) continue
    const cur = sell.get(r.category) ?? { ar: r.categoryAr, sum: 0, n: 0, rev: 0 }
    cur.sum += r.unitPrice; cur.n++; cur.rev += r.postVat; sell.set(r.category, cur)
  }
  const cost = new Map<string, { sum: number; n: number }>()
  for (const p of purchases) {
    if (isSupplierNoise(p.supplier) || p.unitCost <= 0) continue
    const cur = cost.get(p.category) ?? { sum: 0, n: 0 }
    cur.sum += p.unitCost; cur.n++; cost.set(p.category, cur)
  }
  const out: { key: string; ar: string; en: string; avgSell: number; avgCost: number; marginPct: number; revenue: number }[] = []
  for (const [key, v] of sell.entries()) {
    const avgSell = v.sum / v.n
    const c = cost.get(key)
    const avgCost = c && c.n ? c.sum / c.n : 0
    const marginPct = avgSell > 0 && avgCost > 0 ? ((avgSell - avgCost) / avgSell) * 100 : 0
    out.push({ key, ar: v.ar, en: key, avgSell: Math.round(avgSell), avgCost: Math.round(avgCost), marginPct: Math.round(marginPct * 10) / 10, revenue: Math.round(v.rev) })
  }
  return out.sort((a, b) => b.revenue - a.revenue)
}

// ── sales → CRM client join (REAL revenue) ──
type ClientAgg = { revenue: number; invoices: number; collected: number }
let _enriched: Client[] | null = null
function enrichClients(): Client[] {
  if (_enriched) return _enriched
  const normToClient = new Map<string, Client>()
  for (const c of rawClients) normToClient.set(norm(c.nameAr), c)
  const agg = new Map<string, ClientAgg>() // clientId -> agg
  const byName = salesByClientName()
  for (const sn of byName) {
    const n = norm(sn.name)
    let client = normToClient.get(n)
    if (!client) client = rawClients.find(c => { const cn = norm(c.nameAr); return cn.includes(n) || n.includes(cn) })
    if (!client) continue
    const cur = agg.get(client.id) ?? { revenue: 0, invoices: 0, collected: 0 }
    cur.revenue += sn.revenue; cur.invoices += sn.invoices; cur.collected += sn.collected; agg.set(client.id, cur)
  }
  _enriched = rawClients.map(c => {
    const a = agg.get(c.id)
    if (!a) return { ...c, totalRevenue: 0, totalOrders: 0, overdueAmount: 0, riskScore: 20, status: 'lead' as const }
    const overdue = Math.max(0, a.revenue - a.collected)
    const risk = a.revenue > 0 ? Math.min(95, Math.round((overdue / a.revenue) * 80 + 10)) : 20
    return { ...c, totalRevenue: Math.round(a.revenue), totalOrders: a.invoices, overdueAmount: Math.round(overdue), riskScore: risk, status: 'active' as const }
  })
  return _enriched
}
export function getClients(): Client[] { return enrichClients() }
export function getClient(id: string): Client | undefined { return enrichClients().find(c => c.id === id) }
export function crmSummary() {
  const all = enrichClients()
  const withSales = all.filter(c => c.totalRevenue > 0)
  const revenue = all.reduce((s, c) => s + c.totalRevenue, 0)
  const overdue = all.reduce((s, c) => s + c.overdueAmount, 0)
  const atRisk = all.filter(c => c.riskScore >= 60).length
  return { total: all.length, active: withSales.length, revenue, overdue, atRisk, avgRisk: Math.round(all.reduce((s, c) => s + c.riskScore, 0) / all.length) }
}
export function clientsByStatus() {
  const all = enrichClients()
  return { active: all.filter(c => c.status === 'active').length, lead: all.filter(c => c.status === 'lead').length, inactive: all.filter(c => c.status === 'inactive').length, total: all.length }
}
export function topClients(n = 6): Client[] { return [...enrichClients()].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, n) }

// ── Orders repointed to REAL sales invoices ──
export type OrderStatus = 'under_approval' | 'approved' | 'dispatched' | 'on_route' | 'delivered' | 'payment_pending' | 'overdue' | 'paid' | 'cancelled'
export type Order = {
  id: string; number: string; clientId: string; clientName: string; salespersonAr: string; salespersonEn: string
  status: OrderStatus; date: string; dueDate: string; totalAmount: number; marginPct: number; item: string; category: string
}
let _orders: Order[] | null = null
function buildOrders(): Order[] {
  if (_orders) return _orders
  const marginMap = new Map(marginByCategory().map(m => [m.key, m.marginPct]))
  const nameToId = new Map<string, string>()
  for (const c of rawClients) nameToId.set(norm(c.nameAr), c.id)
  const out = sales.map((s, i) => {
    const status: OrderStatus = s.postVat < 0 ? 'cancelled' : s.collected ? 'paid' : 'payment_pending'
    const due = s.date ? new Date(new Date(s.date).getTime() + 7 * 86400000).toISOString().slice(0, 10) : ''
    let cid = nameToId.get(norm(s.clientName)) ?? ''
    if (!cid) { const m = rawClients.find(c => { const cn = norm(c.nameAr); const sn = norm(s.clientName); return cn.includes(sn) || sn.includes(cn) }); if (m) cid = m.id }
    return {
      id: s.id, number: s.invoiceNo || `INV-${i + 1}`, clientId: cid, clientName: s.clientName,
      salespersonAr: s.salespersonAr, salespersonEn: s.salespersonEn, status, date: s.date, dueDate: due,
      totalAmount: s.postVat, marginPct: marginMap.get(s.category) ?? 0, item: s.item, category: s.category
    }
  })
  out.sort((a, b) => (a.date < b.date ? 1 : -1))
  _orders = out
  return out
}
export function getOrders(): Order[] { return buildOrders() }
export function ordersByStatus(): { status: OrderStatus; count: number }[] {
  const map = new Map<OrderStatus, number>()
  for (const o of buildOrders()) map.set(o.status, (map.get(o.status) ?? 0) + 1)
  const order: OrderStatus[] = ['under_approval', 'approved', 'dispatched', 'on_route', 'delivered', 'payment_pending', 'overdue', 'paid', 'cancelled']
  return order.map(s => ({ status: s, count: map.get(s) ?? 0 })).filter(x => x.count > 0)
}
export function ordersSummary() {
  const all = buildOrders()
  const open = all.filter(o => o.status === 'payment_pending').length
  const value = all.reduce((s, o) => s + o.totalAmount, 0)
  const margins = all.filter(o => o.marginPct > 0)
  const avgMargin = margins.length ? margins.reduce((s, o) => s + o.marginPct, 0) / margins.length : 0
  const overdue = all.filter(o => o.status === 'payment_pending').length
  return { total: all.length, open, value, avgMargin: Math.round(avgMargin * 10) / 10, overdue }
}

// ── chart helpers reused by Control Center / Orders ──
export function revenueByMonth(): { t: string; v: number }[] {
  return salesByMonth().map(m => ({ t: m.t, v: Math.round((m.v / 1_000_000) * 10) / 10 }))
}
export function categoryMix(): { key: string; ar: string; en: string; qty: number }[] {
  return salesByCategory().map(c => ({ key: c.key, ar: c.ar, en: c.en, qty: c.qty }))
}
