import type { Bi, Chart, KPI } from './types'

export type SavingsRow = { dept: Bi; before: string; after: string; saved: string; hoursReclaimed: number }
export type SavingsState = { headlineSaved: string; kpis: KPI[]; comparison: Chart; breakdown: SavingsRow[] }

// Deterministic financial-impact view for the Total-Savings page. Static, demo-only figures
// expressed in SAR — the with-vs-without story MEC sees the platform deliver each month.
function band(base: number, jitter: number): number[] {
  return Array.from({ length: 14 }).map((_, i) => Math.max(0, Math.round(base + Math.sin(i / 2) * jitter)))
}

export function getSavings(): SavingsState {
  const beforeSeries = band(140, 14)
  const afterSeries = band(58, 8)
  const comparison: Chart = {
    title: { en: 'OPERATING COST · WITH vs WITHOUT · 14D (SAR K)', ar: 'تكلفة التشغيل · مع وبدون · 14 يومًا (ألف ر.س)' },
    series: [
      { key: 'before', label: { en: 'Without the platform', ar: 'بدون المنصّة' }, data: beforeSeries.map((v, i) => ({ t: `D-${13 - i}`, v })) },
      { key: 'after', label: { en: 'With the platform', ar: 'مع المنصّة' }, data: afterSeries.map((v, i) => ({ t: `D-${13 - i}`, v })), highlight: true }
    ]
  }
  const kpis: KPI[] = [
    { label: { en: 'TOTAL SAVED · 30D', ar: 'إجمالي التوفير · 30 يومًا' }, value: 'SAR 1.9M', delta: '+12.4% vs prev', highlight: true },
    { label: { en: 'HOURS RECLAIMED · 30D', ar: 'ساعات مُستردّة · 30 يومًا' }, value: '2,140h', delta: '+8.1% vs prev' },
    { label: { en: 'ERRORS AVOIDED', ar: 'أخطاء تم تفاديها' }, value: '486', delta: '+5.6% vs prev' },
    { label: { en: 'AVG COST PER ORDER', ar: 'متوسط تكلفة الطلب' }, value: 'SAR 42', delta: '−31% vs prev', highlight: true }
  ]
  const breakdown: SavingsRow[] = [
    { dept: { en: 'Sales & CRM', ar: 'المبيعات وإدارة العملاء' }, before: 'SAR 310K', after: 'SAR 120K', saved: 'SAR 190K', hoursReclaimed: 410 },
    { dept: { en: 'Documents & Intake', ar: 'الوثائق والاستقبال' }, before: 'SAR 280K', after: 'SAR 70K', saved: 'SAR 210K', hoursReclaimed: 520 },
    { dept: { en: 'Approvals', ar: 'الاعتمادات' }, before: 'SAR 220K', after: 'SAR 95K', saved: 'SAR 125K', hoursReclaimed: 240 },
    { dept: { en: 'Warehouse & Inventory', ar: 'المستودع والمخزون' }, before: 'SAR 340K', after: 'SAR 160K', saved: 'SAR 180K', hoursReclaimed: 300 },
    { dept: { en: 'Logistics & Delivery', ar: 'اللوجستيات والتوصيل' }, before: 'SAR 260K', after: 'SAR 110K', saved: 'SAR 150K', hoursReclaimed: 280 },
    { dept: { en: 'Finance & Accounting', ar: 'المالية والمحاسبة' }, before: 'SAR 300K', after: 'SAR 120K', saved: 'SAR 180K', hoursReclaimed: 260 },
    { dept: { en: 'Supplier Planning', ar: 'تخطيط الموردين' }, before: 'SAR 240K', after: 'SAR 95K', saved: 'SAR 145K', hoursReclaimed: 130 }
  ]
  return { headlineSaved: 'SAR 1.9M', kpis, comparison, breakdown }
}
