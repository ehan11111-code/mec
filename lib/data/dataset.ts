import { clients, type Client } from './clients'

export type { Client }

// ── SKUs (MEC food-importer catalog: meat, chicken, vegetables, potatoes + imported lines) ──
export type Sku = { id: string; code: string; nameAr: string; nameEn: string; categoryAr: string; categoryEn: string; originAr: string; originEn: string; unit: string; cost: number; price: number }
export const skus: Sku[] = [
  { id: 'SKU-1001', code: 'BEEF-BR-22', nameAr: 'لحم بقري برازيلي', nameEn: 'Brazilian Beef', categoryAr: 'لحوم', categoryEn: 'Meat', originAr: 'البرازيل', originEn: 'Brazil', unit: 'kg', cost: 22, price: 29 },
  { id: 'SKU-1002', code: 'BEEF-IN-18', nameAr: 'لحم بقري هندي', nameEn: 'Indian Beef', categoryAr: 'لحوم', categoryEn: 'Meat', originAr: 'الهند', originEn: 'India', unit: 'kg', cost: 16, price: 21 },
  { id: 'SKU-1003', code: 'CHICK-BR-09', nameAr: 'دجاج برازيلي كامل', nameEn: 'Brazilian Whole Chicken', categoryAr: 'دواجن', categoryEn: 'Poultry', originAr: 'البرازيل', originEn: 'Brazil', unit: 'kg', cost: 8.5, price: 11.5 },
  { id: 'SKU-1004', code: 'CHICK-FR-12', nameAr: 'صدور دجاج فرنسية', nameEn: 'French Chicken Breast', categoryAr: 'دواجن', categoryEn: 'Poultry', originAr: 'فرنسا', originEn: 'France', unit: 'kg', cost: 12, price: 16 },
  { id: 'SKU-1005', code: 'POT-EG-03', nameAr: 'بطاطس مصرية', nameEn: 'Egyptian Potatoes', categoryAr: 'خضروات', categoryEn: 'Vegetables', originAr: 'مصر', originEn: 'Egypt', unit: 'kg', cost: 2.4, price: 3.6 },
  { id: 'SKU-1006', code: 'POT-FR-05', nameAr: 'بطاطس مجمدة', nameEn: 'Frozen Fries', categoryAr: 'خضروات', categoryEn: 'Vegetables', originAr: 'هولندا', originEn: 'Netherlands', unit: 'kg', cost: 4.2, price: 6.1 },
  { id: 'SKU-1007', code: 'VEG-MX-07', nameAr: 'خضار مشكلة مجمدة', nameEn: 'Mixed Frozen Vegetables', categoryAr: 'خضروات', categoryEn: 'Vegetables', originAr: 'مصر', originEn: 'Egypt', unit: 'kg', cost: 3.1, price: 4.7 },
  { id: 'SKU-1008', code: 'ONION-IN-02', nameAr: 'بصل هندي', nameEn: 'Indian Onions', categoryAr: 'خضروات', categoryEn: 'Vegetables', originAr: 'الهند', originEn: 'India', unit: 'kg', cost: 1.8, price: 2.9 },
  { id: 'SKU-1009', code: 'LAMB-AU-30', nameAr: 'لحم غنم أسترالي', nameEn: 'Australian Lamb', categoryAr: 'لحوم', categoryEn: 'Meat', originAr: 'أستراليا', originEn: 'Australia', unit: 'kg', cost: 31, price: 41 },
  { id: 'SKU-1010', code: 'CHICK-WG-08', nameAr: 'أجنحة دجاج', nameEn: 'Chicken Wings', categoryAr: 'دواجن', categoryEn: 'Poultry', originAr: 'البرازيل', originEn: 'Brazil', unit: 'kg', cost: 7, price: 10 }
]

// ── Order lifecycle (simplified from the brief's 22 statuses into a workable, color-coded set) ──
export type OrderStatus = 'under_approval' | 'approved' | 'dispatched' | 'on_route' | 'delivered' | 'payment_pending' | 'overdue' | 'paid' | 'cancelled'
export type OrderItem = { skuId: string; qty: number; unitPrice: number; cost: number }
export type Order = {
  id: string; number: string; clientId: string; salespersonAr: string; salespersonEn: string
  status: OrderStatus; createdAt: string; dueDate: string
  items: OrderItem[]; totalAmount: number; totalCost: number; marginPct: number; paymentTermsDays: number
}
export type Payment = { orderId: string; clientId: string; amountDue: number; amountPaid: number; dueDate: string; status: 'paid' | 'pending' | 'overdue' }

// Deterministic PRNG (matches the catalog engine style) so the dataset is identical on every load/Vercel.
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 } return h }
function rng(seed: number) { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = t; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296 } }
const BASE_TIME = new Date('2026-06-22T09:00:00Z').getTime()
const DAY = 24 * 60 * 60 * 1000
const STATUS_POOL: OrderStatus[] = ['under_approval', 'approved', 'approved', 'dispatched', 'on_route', 'delivered', 'delivered', 'payment_pending', 'overdue', 'paid', 'paid', 'cancelled']

let _orders: Order[] | null = null
function buildOrders(): Order[] {
  if (_orders) return _orders
  const out: Order[] = []
  let seq = 5200
  for (const c of clients) {
    const r = rng(hash('ord:' + c.id))
    const n = Math.min(4, Math.max(0, Math.floor(c.totalOrders / 6)))
    for (let i = 0; i < n; i++) {
      const itemCount = 1 + Math.floor(r() * 3)
      const items: OrderItem[] = Array.from({ length: itemCount }).map(() => {
        const sku = skus[Math.floor(r() * skus.length)]
        const qty = 50 + Math.floor(r() * 600)
        return { skuId: sku.id, qty, unitPrice: sku.price, cost: sku.cost }
      })
      const totalAmount = items.reduce((s, it) => s + it.qty * it.unitPrice, 0)
      const totalCost = items.reduce((s, it) => s + it.qty * it.cost, 0)
      const marginPct = totalAmount > 0 ? ((totalAmount - totalCost) / totalAmount) * 100 : 0
      let status = STATUS_POOL[Math.floor(r() * STATUS_POOL.length)]
      if (c.overdueAmount > 0 && i === 0) status = 'overdue'
      const createdAt = new Date(BASE_TIME - Math.floor(r() * 60) * DAY).toISOString()
      const dueDate = new Date(BASE_TIME + (c.paymentTermsDays - Math.floor(r() * 20)) * DAY).toISOString()
      out.push({
        id: `O-${seq}`, number: `MEC-${seq}`, clientId: c.id, salespersonAr: c.salespersonAr, salespersonEn: c.salespersonEn,
        status, createdAt, dueDate, items, totalAmount: Math.round(totalAmount), totalCost: Math.round(totalCost),
        marginPct: Math.round(marginPct * 10) / 10, paymentTermsDays: c.paymentTermsDays
      })
      seq++
    }
  }
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  _orders = out
  return out
}

// ── Accessors (the data boundary — swap these bodies for real sources later, shapes stay stable) ──
export function getClients(): Client[] { return clients }
export function getClient(id: string): Client | undefined { return clients.find(c => c.id === id) }
export function getOrders(): Order[] { return buildOrders() }
export function getOrdersByClient(clientId: string): Order[] { return buildOrders().filter(o => o.clientId === clientId) }
export function getPayments(): Payment[] {
  return buildOrders().filter(o => ['delivered', 'payment_pending', 'overdue', 'paid'].includes(o.status)).map(o => ({
    orderId: o.id, clientId: o.clientId, amountDue: o.totalAmount,
    amountPaid: o.status === 'paid' ? o.totalAmount : 0, dueDate: o.dueDate,
    status: o.status === 'paid' ? 'paid' : o.status === 'overdue' ? 'overdue' : 'pending'
  }))
}

// ── Aggregates for charts/KPIs ──
export const fmtSAR = (n: number) => n >= 1_000_000 ? `SAR ${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `SAR ${(n / 1000).toFixed(0)}K` : `SAR ${n}`
export const clientName = (c: Client, locale: 'en' | 'ar') => locale === 'ar' ? c.nameAr : c.nameEn
export const skuById = (id: string) => skus.find(s => s.id === id)

export function ordersByStatus(): { status: OrderStatus; count: number }[] {
  const map = new Map<OrderStatus, number>()
  for (const o of buildOrders()) map.set(o.status, (map.get(o.status) ?? 0) + 1)
  const order: OrderStatus[] = ['under_approval', 'approved', 'dispatched', 'on_route', 'delivered', 'payment_pending', 'overdue', 'paid', 'cancelled']
  return order.map(s => ({ status: s, count: map.get(s) ?? 0 })).filter(x => x.count > 0)
}
export function clientsByStatus() {
  const all = getClients()
  return {
    active: all.filter(c => c.status === 'active').length,
    lead: all.filter(c => c.status === 'lead').length,
    inactive: all.filter(c => c.status === 'inactive').length,
    total: all.length
  }
}
export function topClients(n = 6): Client[] { return [...getClients()].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, n) }
export function revenueByMonth(): { t: string; v: number }[] {
  const r = rng(hash('rev'))
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  const base = getClients().reduce((s, c) => s + c.totalRevenue, 0) / 6 / 1_000_000
  return months.map((m, i) => ({ t: m, v: Math.round((base * (0.7 + r() * 0.6)) * 10) / 10 }))
}
export function categoryMix(): { key: string; ar: string; en: string; qty: number }[] {
  const map = new Map<string, { ar: string; en: string; qty: number }>()
  for (const o of buildOrders()) for (const it of o.items) {
    const sku = skuById(it.skuId); if (!sku) continue
    const cur = map.get(sku.categoryEn) ?? { ar: sku.categoryAr, en: sku.categoryEn, qty: 0 }
    cur.qty += it.qty; map.set(sku.categoryEn, cur)
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.qty - a.qty)
}

// CRM + Orders headline figures
export function crmSummary() {
  const all = getClients()
  const revenue = all.reduce((s, c) => s + c.totalRevenue, 0)
  const overdue = all.reduce((s, c) => s + c.overdueAmount, 0)
  const atRisk = all.filter(c => c.riskScore >= 60).length
  return { total: all.length, revenue, overdue, atRisk, avgRisk: Math.round(all.reduce((s, c) => s + c.riskScore, 0) / all.length) }
}
export function ordersSummary() {
  const all = buildOrders()
  const open = all.filter(o => !['paid', 'cancelled'].includes(o.status)).length
  const value = all.reduce((s, o) => s + o.totalAmount, 0)
  const avgMargin = all.length ? all.reduce((s, o) => s + o.marginPct, 0) / all.length : 0
  const overdue = all.filter(o => o.status === 'overdue').length
  return { total: all.length, open, value, avgMargin: Math.round(avgMargin * 10) / 10, overdue }
}
