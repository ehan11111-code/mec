// Data-integrity / contradiction detector. Scans the real dataset for figures that don't reconcile or
// that warrant attention, and surfaces them as "concern" notifications + a banner. Each concern is a
// short report: what's off, the numbers, and what to do. Deterministic, client-safe.
import { salesSummary, collectionsSummary, profitSummary, crmSummary, getSales, getPurchases, salesByClientName, productMargins, getClients, warehouseStock, getInventory, fmtSAR, fmtNum, WAREHOUSE_CAPACITY } from './dataset'

type Bi = { en: string; ar: string }

export type Severity = 'high' | 'medium' | 'low' | 'info'
export type Concern = {
  id: string
  severity: Severity
  title: { en: string; ar: string }       // short label
  detail: { en: string; ar: string }      // the report (the numbers + what to do)
  conclusion: { en: string; ar: string }  // likely cause — often a data-entry / recording error, not a real problem
}

const SUPPLIER_NOISE = /ضريبة|اجمالي|إجمالي|المجموع/

export function getConcerns(): Concern[] {
  const out: Concern[] = []
  const s = salesSummary()
  const col = collectionsSummary()
  const ps = profitSummary()
  const crm = crmSummary()

  // 1) Warehouse ledger doesn't reconcile: recorded "in" exceeds "out" beyond the physical capacity,
  //    because outbound isn't logged for some SKUs.
  const ws = warehouseStock()
  if (ws.unreconciled > 0 && ws.rawOnHand > WAREHOUSE_CAPACITY) {
    out.push({
      id: 'inbound-gap', severity: 'medium',
      title: { en: 'Warehouse ledger doesn’t reconcile', ar: 'دفتر المستودع لا يتسوّى' },
      detail: {
        en: `The stock ledger nets to +${fmtNum(ws.netRecorded)} cartons (received − issued) — more than the ${fmtNum(WAREHOUSE_CAPACITY)} capacity — because ${ws.unreconciled} SKU(s) record far more received than issued (outbound not logged). Excluding those, reconciled on-hand is ${fmtNum(ws.onHand)} (${ws.utilization}% of capacity), which is plausible.`,
        ar: `يبلغ صافي دفتر المخزون +${fmtNum(ws.netRecorded)} كرتون (وارد − صادر) — أكثر من سعة ${fmtNum(WAREHOUSE_CAPACITY)} — لأن ${ws.unreconciled} صنف سجّل وارده أكثر بكثير من صادره (لم يُسجَّل الصرف). باستبعادها، يصبح المخزون المُسوّى ${fmtNum(ws.onHand)} (${ws.utilization}% من السعة)، وهو منطقي.`
      },
      conclusion: {
        en: 'A data-entry gap, not a real overflow — receipts were logged but the matching issues weren’t for a few SKUs (e.g. بوبي فيل الكامل: 4,083 in / 175 out). Log the missing outbound for the flagged SKUs and the total will reconcile.',
        ar: 'فجوة إدخال لا فائض حقيقي — سُجّلت المستلمات دون تسجيل الصرف لبعض الأصناف (مثل بوبي فيل الكامل: 4,083 وارد / 175 صادر). سجّل الصادر الناقص للأصناف المُعلَّمة ليتسوّى الإجمالي.'
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
      },
      conclusion: {
        en: 'Could be a real collection problem — or a data-entry one: payments that were collected but never marked “تم” in the sheet inflate this figure. Confirm the collection status is up to date first.',
        ar: 'قد تكون مشكلة تحصيل حقيقية — أو خطأ إدخال: مدفوعات حُصّلت لكن لم تُعلَّم «تم» في الورقة ترفع هذا الرقم. تأكّد أولًا من تحديث حالة التحصيل.'
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
      },
      conclusion: {
        en: 'Often a data-entry error — a mistyped sell price or purchase cost, or the wrong cost matched to the product — rather than a truly loss-making sale. Check the unit price and cost entries before concluding it’s a real loss.',
        ar: 'غالبًا خطأ إدخال — سعر بيع أو تكلفة شراء مكتوبة خطأ، أو تكلفة خاطئة طُوبقت بالمنتج — لا خسارة حقيقية. راجع قيود سعر الوحدة والتكلفة قبل الجزم بأنها خسارة فعلية.'
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
      },
      conclusion: {
        en: 'May be a genuine thin-margin deal — or a price/cost entry error inflating the gap. Verify the recorded prices before treating it as underpricing.',
        ar: 'قد تكون صفقة بهامش رفيع فعلًا — أو خطأ في إدخال السعر/التكلفة يضخّم الفارق. تحقّق من الأسعار المسجّلة قبل اعتبارها تسعيرًا منخفضًا.'
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
      },
      conclusion: {
        en: 'Almost certainly a data-entry mismatch — the product is named differently in the sales sheet vs the purchase sheet, so they don’t link. Align the naming (or add the missing purchase line).',
        ar: 'شبه مؤكّد أنه عدم تطابق في الإدخال — اسم المنتج مختلف في ورقة المبيعات عنه في ورقة المشتريات فلا يرتبطان. وحّد التسمية (أو أضف بند الشراء الناقص).'
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
      },
      conclusion: {
        en: 'This is derived from the collection status — if some of their payments simply weren’t marked collected, the risk is overstated. Confirm their payment records before tightening credit.',
        ar: 'مشتقّة من حالة التحصيل — إن لم تُعلَّم بعض مدفوعاتهم كمحصّلة فإن المخاطر مبالغ فيها. تأكّد من سجلات سدادهم قبل تشديد الائتمان.'
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
// The supporting data behind a concern — the "demonstration" shown when the message is opened.
export type ConcernEvidence = {
  stats?: { label: Bi; value: string }[]
  table?: { columns: Bi[]; rows: (string | number)[][] }
}
const SUPPLIER_NOISE2 = /ضريبة|اجمالي|إجمالي|المجموع/
export function getConcernById(id: string): Concern | undefined { return getConcerns().find(c => c.id === id) }
export function getConcernEvidence(id: string): ConcernEvidence {
  if (id === 'receivables') {
    const s = salesSummary()
    const debt = salesByClientName().filter(x => x.outstanding > 0).slice(0, 12)
    return {
      stats: [
        { label: { en: 'Revenue', ar: 'الإيراد' }, value: fmtSAR(s.revenue) },
        { label: { en: 'Collected', ar: 'المحصّل' }, value: fmtSAR(s.collected) },
        { label: { en: 'Outstanding', ar: 'المستحق' }, value: fmtSAR(s.outstanding) }
      ],
      table: { columns: [{ en: 'Client', ar: 'العميل' }, { en: 'Invoices', ar: 'الفواتير' }, { en: 'Outstanding', ar: 'المستحق' }], rows: debt.map(d => [d.name, d.invoices, fmtSAR(d.outstanding)]) }
    }
  }
  if (id === 'loss-makers') {
    const list = productMargins().filter(p => p.marginPct != null && p.marginPct < 0).slice(0, 15)
    return { table: { columns: [{ en: 'Product', ar: 'المنتج' }, { en: 'Sell', ar: 'البيع' }, { en: 'Cost', ar: 'التكلفة' }, { en: 'Margin', ar: 'الهامش' }], rows: list.map(p => [p.item, fmtSAR(p.avgSell), p.unitCost != null ? fmtSAR(p.unitCost) : '—', `${p.marginPct}%`]) } }
  }
  if (id === 'below-min') {
    const list = productMargins().filter(p => p.confidence !== 'none' && p.belowMin).slice(0, 15)
    return { table: { columns: [{ en: 'Product', ar: 'المنتج' }, { en: 'Margin', ar: 'الهامش' }, { en: 'Floor', ar: 'الحد' }], rows: list.map(p => [p.item, `${p.marginPct}%`, `${p.minMargin}%`]) } }
  }
  if (id === 'unpriced') {
    const list = productMargins().filter(p => p.confidence === 'none').slice(0, 15)
    return { table: { columns: [{ en: 'Product', ar: 'المنتج' }, { en: 'Units', ar: 'الوحدات' }, { en: 'Revenue', ar: 'الإيراد' }], rows: list.map(p => [p.item, fmtNum(p.units), fmtSAR(p.revenue)]) } }
  }
  if (id === 'at-risk-clients') {
    const list = getClients().filter(c => c.riskScore >= 60 && c.totalRevenue > 0).sort((a, b) => b.overdueAmount - a.overdueAmount).slice(0, 12)
    return { table: { columns: [{ en: 'Client', ar: 'العميل' }, { en: 'Risk', ar: 'المخاطر' }, { en: 'Overdue', ar: 'المتأخّر' }], rows: list.map(c => [c.nameAr, `${c.riskScore}%`, fmtSAR(c.overdueAmount)]) } }
  }
  if (id === 'inbound-gap') {
    const ws = warehouseStock()
    const bad = getInventory().filter(r => r.unreconciled).sort((a, b) => b.rawNet - a.rawNet).slice(0, 12)
    return {
      stats: [
        { label: { en: 'Recorded net (in−out)', ar: 'الصافي المسجّل' }, value: fmtNum(ws.netRecorded) },
        { label: { en: 'Capacity', ar: 'السعة' }, value: fmtNum(ws.capacity) },
        { label: { en: 'Reconciled on-hand', ar: 'المخزون المُسوّى' }, value: `${fmtNum(ws.onHand)} (${ws.utilization}%)` }
      ],
      table: {
        columns: [{ en: 'Unreconciled SKU', ar: 'صنف غير مُسوّى' }, { en: 'In', ar: 'وارد' }, { en: 'Out', ar: 'صادر' }, { en: 'Net', ar: 'الصافي' }],
        rows: bad.map(r => [r.item, fmtNum(r.inbound), fmtNum(r.outbound), fmtNum(r.rawNet)])
      }
    }
  }
  return {}
}

export function getConcernNotes(nowIso: string): ConcernNote[] {
  // The message = the report + a conclusion ("Likely cause: … possibly a data-entry error").
  return getConcerns().map(c => ({
    id: `concern-${c.id}`, type: 'concern' as const,
    title: {
      en: `${c.detail.en}\n\nLikely cause: ${c.conclusion.en}`,
      ar: `${c.detail.ar}\n\nالسبب المرجّح: ${c.conclusion.ar}`
    },
    deptName: { en: `Concern · ${c.title.en}`, ar: `تنبيه · ${c.title.ar}` },
    ts: nowIso, read: false, link: '/notifications'
  }))
}
