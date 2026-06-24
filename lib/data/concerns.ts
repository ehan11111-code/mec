// Data-integrity / contradiction detector. Scans the real dataset for figures that don't reconcile or
// that warrant attention, and surfaces them as "concern" notifications + a banner. Each concern is a
// short report: what's off, the numbers, and what to do. Deterministic, client-safe.
import { salesSummary, collectionsSummary, profitSummary, crmSummary, getSales, getPurchases, fmtSAR, fmtNum, WAREHOUSE_CAPACITY } from './dataset'

export type Severity = 'high' | 'medium' | 'low' | 'info'
export type Concern = {
  id: string
  severity: Severity
  title: { en: string; ar: string }   // short label
  detail: { en: string; ar: string }  // the report (numbers + what to do)
}

const SUPPLIER_NOISE = /ضريبة|اجمالي|إجمالي|المجموع/

export function getConcerns(): Concern[] {
  const out: Concern[] = []
  const s = salesSummary()
  const col = collectionsSummary()
  const ps = profitSummary()
  const crm = crmSummary()

  // 1) Inbound stock under-captured: procurement cartons << sales cartons → on-hand can't reconcile.
  const sold = Math.round(getSales().reduce((a, r) => a + (r.cartons || 0), 0))
  const bought = Math.round(getPurchases().filter(p => !SUPPLIER_NOISE.test(p.supplier)).reduce((a, p) => a + (p.cartons || 0), 0))
  if (bought > 0 && bought < sold * 0.9) {
    out.push({
      id: 'inbound-gap', severity: 'medium',
      title: { en: 'Inbound stock under-recorded', ar: 'الوارد للمخزون غير مكتمل التسجيل' },
      detail: {
        en: `Procurement records ${fmtNum(bought)} cartons in, but sales moved ${fmtNum(sold)} cartons out — inbound is incomplete, so true stock on hand and warehouse load (vs ${fmtNum(WAREHOUSE_CAPACITY)} capacity) can't be reconciled. Wire the warehouse ledger (المخزون 2025/2026) to close the gap.`,
        ar: `سجّلت المشتريات ${fmtNum(bought)} كرتون وارد، بينما باعت المبيعات ${fmtNum(sold)} كرتون — الوارد غير مكتمل، لذا لا يمكن التوفيق بين المخزون الفعلي وحمل المستودع (مقابل سعة ${fmtNum(WAREHOUSE_CAPACITY)}). اربط سجل المستودع (المخزون 2025/2026) لسدّ الفجوة.`
      }
    })
  }

  // 2) High uncollected receivables.
  const pct = s.revenue > 0 ? Math.round((s.outstanding / s.revenue) * 100) : 0
  if (pct >= 50) {
    out.push({
      id: 'receivables', severity: 'high',
      title: { en: 'High uncollected receivables', ar: 'مستحقات غير محصّلة مرتفعة' },
      detail: {
        en: `${pct}% of revenue (${fmtSAR(s.outstanding)} of ${fmtSAR(s.revenue)}) is still uncollected. Collections are running well behind sales — prioritise the biggest debtors.`,
        ar: `${pct}% من الإيراد (${fmtSAR(s.outstanding)} من ${fmtSAR(s.revenue)}) ما زال غير محصّل. التحصيل متأخّر كثيرًا عن المبيعات — ركّز على أكبر المدينين.`
      }
    })
  }

  // 3) Products sold below cost.
  if (ps.lossMakers > 0) {
    out.push({
      id: 'loss-makers', severity: 'high',
      title: { en: 'Products sold below cost', ar: 'منتجات تُباع بأقل من التكلفة' },
      detail: {
        en: `${ps.lossMakers} product(s) have a negative gross margin — each sale loses money. Review their pricing against the matched purchase cost.`,
        ar: `${ps.lossMakers} منتج بهامش إجمالي سالب — كل بيعة تخسر. راجع تسعيرها مقابل تكلفة الشراء المطابقة.`
      }
    })
  }

  // 4) Below minimum-margin floor.
  if (ps.belowMin > 0) {
    out.push({
      id: 'below-min', severity: 'medium',
      title: { en: 'Products below minimum margin', ar: 'منتجات تحت الحد الأدنى للهامش' },
      detail: {
        en: `${ps.belowMin} product(s) sell below MEC's minimum-margin floor (meat 3% · chicken 5% · vegetables 6% · potatoes 10%). They need a pricing or approval review.`,
        ar: `${ps.belowMin} منتج يُباع تحت الحد الأدنى لهامش MEC (لحوم 3% · دجاج 5% · خضروات 6% · بطاطس 10%). يحتاج مراجعة تسعير أو اعتماد.`
      }
    })
  }

  // 5) Products with no matched cost (margin unknown).
  if (ps.unpriced > 0) {
    out.push({
      id: 'unpriced', severity: 'low',
      title: { en: 'Products with unknown margin', ar: 'منتجات بهامش غير معروف' },
      detail: {
        en: `${ps.unpriced} product(s) couldn't be matched to a purchase cost, so their margin is unknown. Add their procurement lines to price them.`,
        ar: `${ps.unpriced} منتج لم يُطابَق بتكلفة شراء، لذا هامشه غير معروف. أضِف بنود شرائها لتسعيرها.`
      }
    })
  }

  // 6) High-risk clients.
  if (crm.atRisk > 0) {
    out.push({
      id: 'at-risk-clients', severity: 'medium',
      title: { en: 'High-risk clients', ar: 'عملاء عالو المخاطر' },
      detail: {
        en: `${crm.atRisk} client(s) carry a high risk score (large share of their sales unpaid). Tighten their credit and chase collection.`,
        ar: `${crm.atRisk} عميل بدرجة مخاطر عالية (نسبة كبيرة من مبيعاتهم غير مسددة). شدِّد ائتمانهم وتابع التحصيل.`
      }
    })
  }

  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2, info: 3 }
  return out.sort((a, b) => rank[a.severity] - rank[b.severity])
}

// Concerns as notification-shaped objects (merged into the bell + notifications feed).
export type ConcernNote = {
  id: string; type: 'concern'; title: { en: string; ar: string }; deptName: { en: string; ar: string }
  ts: string; read: boolean; link: string
}
export function getConcernNotes(nowIso: string): ConcernNote[] {
  return getConcerns().map(c => ({
    id: `concern-${c.id}`, type: 'concern' as const,
    title: c.detail,
    deptName: { en: `Concern · ${c.title.en}`, ar: `تنبيه · ${c.title.ar}` },
    ts: nowIso, read: false, link: '/notifications'
  }))
}
