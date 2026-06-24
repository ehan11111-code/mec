// Report builders — each produces one section from the real dataset, tagged with the permission needed
// to see it. Used by /api/report (JARVIS "print me a report …") and the overview company report.
import {
  salesSummary, salesByMonth, salesBySalesperson, salesByCategory, collectionsSummary, profitSummary,
  topClients, productMargins, warehouseStock, getInventory, operationsSnapshot, getSales,
  categoryLabel, fmtSAR, fmtNum, clientName, monthLabel
} from '@/lib/data/dataset'
import { getConcerns } from '@/lib/data/concerns'
import type { Permission } from '@/lib/auth/users'

export type ReportStat = { label: string; value: string }
export type ReportTable = { columns: string[]; rows: (string | number)[][] }
export type ReportSection = { id: string; heading: string; stats?: ReportStat[]; table?: ReportTable; note?: string }
export type ReportSpec = {
  title: string; subtitle?: string; period?: string; generatedAt: string
  sections: ReportSection[]; suggestions?: { area: string; text: string }[]
}
export type Ctx = { locale: 'en' | 'ar'; days?: number }
type L = (en: string, ar: string) => string
const lf = (locale: 'en' | 'ar'): L => (en, ar) => (locale === 'ar' ? ar : en)

// sales rows within the last `days` (relative to the latest dated invoice)
function rangeRows(days?: number) {
  const rows = getSales()
  if (!days) return rows
  const dates = rows.map(r => r.date).filter(Boolean).sort()
  const latest = dates[dates.length - 1]; if (!latest) return rows
  const cutoff = new Date(Date.parse(latest) - days * 86400000).toISOString().slice(0, 10)
  return rows.filter(r => r.date && r.date >= cutoff)
}

export type Builder = { id: string; perm: Permission; label: { en: string; ar: string }; build: (ctx: Ctx) => ReportSection | null }

export const BUILDERS: Builder[] = [
  {
    id: 'executive', perm: 'dashboard', label: { en: 'Executive summary', ar: 'الملخّص التنفيذي' },
    build: ({ locale }) => {
      const t = lf(locale); const s = salesSummary(); const p = profitSummary(); const c = collectionsSummary()
      return {
        id: 'executive', heading: t('Executive summary', 'الملخّص التنفيذي'),
        stats: [
          { label: t('Revenue', 'الإيراد'), value: fmtSAR(s.revenue) },
          { label: t('Gross profit', 'الربح الإجمالي'), value: fmtSAR(p.grossProfit) },
          { label: t('Margin', 'الهامش'), value: `${p.marginPct}%` },
          { label: t('Collected', 'المحصّل'), value: fmtSAR(c.collected) },
          { label: t('Outstanding', 'المستحق'), value: fmtSAR(c.outstanding) },
          { label: t('Invoices', 'الفواتير'), value: fmtNum(s.invoices) }
        ]
      }
    }
  },
  {
    id: 'revenue_by_salesperson', perm: 'analytics', label: { en: 'Revenue by salesperson', ar: 'الإيراد حسب المندوب' },
    build: ({ locale, days }) => {
      const t = lf(locale); const map = new Map<string, { en: string; v: number; n: number }>()
      for (const r of rangeRows(days)) { const cur = map.get(r.salespersonAr) ?? { en: r.salespersonEn, v: 0, n: 0 }; cur.v += r.postVat; cur.n++; map.set(r.salespersonAr, cur) }
      const rows = [...map.entries()].map(([ar, v]) => ({ name: locale === 'ar' ? ar : v.en, v: v.v, n: v.n })).sort((a, b) => b.v - a.v)
      return { id: 'revenue_by_salesperson', heading: t('Revenue by salesperson', 'الإيراد حسب المندوب'), table: { columns: [t('Salesperson', 'المندوب'), t('Invoices', 'الفواتير'), t('Revenue', 'الإيراد')], rows: rows.map(r => [r.name, r.n, fmtSAR(r.v)]) } }
    }
  },
  {
    id: 'revenue_by_month', perm: 'dashboard', label: { en: 'Revenue by month', ar: 'الإيراد حسب الشهر' },
    build: ({ locale }) => {
      const t = lf(locale); const m = salesByMonth()
      return { id: 'revenue_by_month', heading: t('Revenue by month', 'الإيراد حسب الشهر'), table: { columns: [t('Month', 'الشهر'), t('Revenue', 'الإيراد')], rows: m.map(x => [locale === 'ar' ? x.tAr : x.t, fmtSAR(x.v)]) } }
    }
  },
  {
    id: 'revenue_by_category', perm: 'analytics', label: { en: 'Revenue by category', ar: 'الإيراد حسب الفئة' },
    build: ({ locale }) => {
      const t = lf(locale); const c = salesByCategory()
      return { id: 'revenue_by_category', heading: t('Revenue by category', 'الإيراد حسب الفئة'), table: { columns: [t('Category', 'الفئة'), t('Qty', 'الكمية'), t('Revenue', 'الإيراد')], rows: c.map(x => [categoryLabel(x.key, locale), fmtNum(x.qty), fmtSAR(x.v)]) } }
    }
  },
  {
    id: 'top_clients', perm: 'clients', label: { en: 'Top clients', ar: 'أعلى العملاء' },
    build: ({ locale }) => {
      const t = lf(locale); const top = topClients(12)
      return { id: 'top_clients', heading: t('Top clients by revenue', 'أعلى العملاء إيرادًا'), table: { columns: [t('Client', 'العميل'), t('Revenue', 'الإيراد'), t('Overdue', 'المتأخّر')], rows: top.map(c => [clientName(c, locale), fmtSAR(c.totalRevenue), fmtSAR(c.overdueAmount)]) } }
    }
  },
  {
    id: 'collections', perm: 'finance', label: { en: 'Collections & receivables', ar: 'التحصيل والمستحقات' },
    build: ({ locale }) => {
      const t = lf(locale); const c = collectionsSummary()
      return { id: 'collections', heading: t('Collections & receivables', 'التحصيل والمستحقات'), stats: [{ label: t('Collected', 'المحصّل'), value: fmtSAR(c.collected) }, { label: t('Outstanding', 'المستحق'), value: fmtSAR(c.outstanding) }, { label: t('Cash', 'نقدًا'), value: fmtSAR(c.cash) }, { label: t('Bank', 'تحويل'), value: fmtSAR(c.bank) }] }
    }
  },
  {
    id: 'products_margin', perm: 'analytics', label: { en: 'Product margins', ar: 'هوامش المنتجات' },
    build: ({ locale }) => {
      const t = lf(locale); const list = productMargins().filter(p => p.confidence !== 'none').slice(0, 12)
      return { id: 'products_margin', heading: t('Top products by gross profit', 'أعلى المنتجات ربحًا'), table: { columns: [t('Product', 'المنتج'), t('Units', 'الوحدات'), t('Margin', 'الهامش'), t('Gross profit', 'الربح')], rows: list.map(p => [p.item, fmtNum(p.units), p.marginPct != null ? `${p.marginPct}%` : '—', p.grossProfit != null ? fmtSAR(p.grossProfit) : '—']) } }
    }
  },
  {
    id: 'inventory_status', perm: 'orders', label: { en: 'Inventory status', ar: 'حالة المخزون' },
    build: ({ locale }) => {
      const t = lf(locale); const w = warehouseStock(); const reorder = getInventory().filter(r => r.needsReorder).slice(0, 10)
      return { id: 'inventory_status', heading: t('Inventory status', 'حالة المخزون'), stats: [{ label: t('On hand', 'المتوفّر'), value: `${fmtNum(w.onHand)} / ${fmtNum(w.capacity)}` }, { label: t('Utilization', 'الاستخدام'), value: `${w.utilization}%` }, { label: t('Need reorder', 'إعادة طلب'), value: String(w.reorder) }, { label: t('Stock value', 'القيمة'), value: fmtSAR(w.value) }], table: { columns: [t('Reorder now', 'لإعادة الطلب'), t('On hand', 'المتوفّر'), t('Reorder pt', 'نقطة الطلب')], rows: reorder.map(r => [r.item, fmtNum(r.onHand), fmtNum(r.rop)]) } }
    }
  },
  {
    id: 'delayed_orders', perm: 'orders', label: { en: 'Delayed payments', ar: 'المدفوعات المتأخرة' },
    build: ({ locale }) => {
      const t = lf(locale); const snap = operationsSnapshot()
      return { id: 'delayed_orders', heading: t('Delayed payments', 'المدفوعات المتأخرة'), stats: [{ label: t('Delayed orders', 'طلبات متأخرة'), value: String(snap.delayed.count) }, { label: t('Value', 'القيمة'), value: fmtSAR(snap.delayed.value) }, { label: t('Payments due', 'مستحقات'), value: fmtSAR(snap.payments.due) }], table: { columns: [t('Client', 'العميل'), t('Invoices', 'الفواتير'), t('Outstanding', 'المستحق')], rows: snap.payments.debtors.map(d => [d.name, d.invoices, fmtSAR(d.outstanding)]) } }
    }
  },
  {
    id: 'concerns', perm: 'dashboard', label: { en: 'Data concerns', ar: 'ملاحظات البيانات' },
    build: ({ locale }) => {
      const t = lf(locale); const c = getConcerns()
      if (!c.length) return null
      return { id: 'concerns', heading: t('Data concerns', 'ملاحظات البيانات'), table: { columns: [t('Concern', 'الملاحظة'), t('Severity', 'الخطورة')], rows: c.map(x => [x.title[locale], x.severity]) } }
    }
  }
]

export function builderById(id: string) { return BUILDERS.find(b => b.id === id) }

// The full company overview report = every section the user is permitted to see.
export const OVERVIEW_BUILDERS = ['executive', 'revenue_by_month', 'revenue_by_salesperson', 'revenue_by_category', 'top_clients', 'collections', 'products_margin', 'inventory_status', 'delayed_orders', 'concerns']

export function buildSections(ids: string[], perms: Permission[], ctx: Ctx): ReportSection[] {
  const out: ReportSection[] = []
  for (const id of ids) {
    const b = builderById(id)
    if (!b || !perms.includes(b.perm)) continue
    const sec = b.build(ctx)
    if (sec) out.push(sec)
  }
  return out
}
