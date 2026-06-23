// JARVIS data-engine: answers real quantitative questions from the dataset with no API key. Used as
// the instant default and as the graceful fallback when the OpenAI route is unavailable. Also exports
// buildContext() — a compact data brief the /api/jarvis route feeds to ChatGPT.
import {
  salesSummary, salesByMonth, salesBySalesperson, salesByClientName, salesByCategory, topProducts,
  collectionsSummary, supplierSpend, procurementSummary, marginByCategory, crmSummary, profitSummary,
  monthLabel, categoryLabel, fmtSAR, MONTHS
} from '@/lib/data/dataset'

export type JarvisReply = { answer: string; rows?: { label: string; value: string }[] }

const MONTH_WORDS: Record<string, string> = {
  october: '10', oct: '10', أكتوبر: '10', اكتوبر: '10', november: '11', nov: '11', نوفمبر: '11',
  december: '12', dec: '12', ديسمبر: '12', january: '01', jan: '01', يناير: '01', february: '02', feb: '02', فبراير: '02',
  march: '03', mar: '03', مارس: '03', april: '04', apr: '04', أبريل: '04', ابريل: '04', may: '05', مايو: '05', june: '06', jun: '06', يونيو: '06'
}
function findMonth(q: string): string | undefined {
  for (const [w, mm] of Object.entries(MONTH_WORDS)) if (q.includes(w)) { const m = MONTHS.find(x => x.slice(5, 7) === mm); if (m) return m }
  return undefined
}

export function answer(question: string, locale: 'en' | 'ar'): JarvisReply {
  const q = question.toLowerCase()
  const ar = locale === 'ar'
  const month = findMonth(q)
  const filter = month ? { month } : undefined
  const mLabel = month ? monthLabel(month, locale) : ''

  // revenue / sales
  if (/(revenue|sales|مبيعات|إيراد|ايراد|الدخل)/.test(q) && !/product|منتج|salesperson|مندوب|client|عميل|category|فئة/.test(q)) {
    const s = salesSummary(filter)
    return {
      answer: ar
        ? `إجمالي المبيعات${month ? ` في ${mLabel}` : ''} هو ${fmtSAR(s.revenue)} عبر ${s.invoices} فاتورة، منها ${fmtSAR(s.collected)} محصّلة و${fmtSAR(s.outstanding)} مستحقة. ضريبة القيمة المضافة ${fmtSAR(s.vat)}.`
        : `Total sales${month ? ` in ${mLabel}` : ''} are ${fmtSAR(s.revenue)} across ${s.invoices} invoices — ${fmtSAR(s.collected)} collected, ${fmtSAR(s.outstanding)} outstanding. VAT ${fmtSAR(s.vat)}.`,
      rows: salesByMonth().map(m => ({ label: ar ? m.tAr : m.t, value: fmtSAR(m.v) }))
    }
  }
  // top clients
  if (/(top client|best client|biggest client|أكبر عميل|أفضل عميل|أعلى عميل|كبار العملاء)/.test(q)) {
    const top = salesByClientName(filter).slice(0, 5)
    return {
      answer: ar ? `أعلى العملاء${month ? ` في ${mLabel}` : ''}: ${top[0]?.name} بـ ${fmtSAR(top[0]?.revenue ?? 0)}.`
        : `Top client${month ? ` in ${mLabel}` : ''}: ${top[0]?.name} at ${fmtSAR(top[0]?.revenue ?? 0)}.`,
      rows: top.map(c => ({ label: c.name, value: fmtSAR(c.revenue) }))
    }
  }
  // who owes us / receivables
  if (/(owe|owes|receivable|outstanding|unpaid|متأخر|مستحق|مدين|يدين|تحصيل)/.test(q)) {
    const c = collectionsSummary(filter)
    const debtors = salesByClientName(filter).filter(x => x.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 6)
    return {
      answer: ar ? `المستحقات المفتوحة${month ? ` في ${mLabel}` : ''} ${fmtSAR(c.outstanding)} مقابل ${fmtSAR(c.collected)} محصّلة.`
        : `Open receivables${month ? ` in ${mLabel}` : ''} are ${fmtSAR(c.outstanding)} vs ${fmtSAR(c.collected)} collected.`,
      rows: debtors.map(d => ({ label: d.name, value: fmtSAR(d.outstanding) }))
    }
  }
  // margin
  if (/(margin|profit|هامش|ربح)/.test(q)) {
    const rows = marginByCategory()
    return {
      answer: ar ? `الهامش حسب الفئة: ${rows.map(r => `${categoryLabel(r.key, 'ar')} ${r.marginPct}%`).join('، ')}.`
        : `Gross margin by category: ${rows.map(r => `${r.key} ${r.marginPct}%`).join(', ')}.`,
      rows: rows.map(r => ({ label: categoryLabel(r.key, locale), value: `${r.marginPct}% · ${fmtSAR(r.revenue)}` }))
    }
  }
  // top products
  if (/(product|item|منتج|صنف|أصناف)/.test(q)) {
    const top = topProducts(filter, 6)
    return {
      answer: ar ? `أعلى المنتجات${month ? ` في ${mLabel}` : ''}: ${top[0]?.item} بـ ${fmtSAR(top[0]?.revenue ?? 0)}.`
        : `Top product${month ? ` in ${mLabel}` : ''}: ${top[0]?.item} at ${fmtSAR(top[0]?.revenue ?? 0)}.`,
      rows: top.map(p => ({ label: p.item, value: fmtSAR(p.revenue) }))
    }
  }
  // salesperson
  if (/(salesperson|sales rep|seller|مندوب|مناديب|البائع)/.test(q)) {
    const reps = salesBySalesperson(filter)
    return {
      answer: ar ? `أعلى مندوب${month ? ` في ${mLabel}` : ''}: ${reps[0]?.ar} بـ ${fmtSAR(reps[0]?.v ?? 0)} عبر ${reps[0]?.invoices} فاتورة.`
        : `Top salesperson${month ? ` in ${mLabel}` : ''}: ${reps[0]?.en} at ${fmtSAR(reps[0]?.v ?? 0)} over ${reps[0]?.invoices} invoices.`,
      rows: reps.map(r => ({ label: ar ? r.ar : r.en, value: fmtSAR(r.v) }))
    }
  }
  // supplier / procurement
  if (/(supplier|purchase|procure|spend|مورد|موردين|مشتريات|شراء)/.test(q)) {
    const sup = supplierSpend(6); const p = procurementSummary()
    return {
      answer: ar ? `إجمالي المشتريات ${fmtSAR(p.spend)} من ${p.suppliers} مورّدًا. أكبر مورّد: ${sup[0]?.supplier}.`
        : `Total procurement is ${fmtSAR(p.spend)} across ${p.suppliers} suppliers. Top supplier: ${sup[0]?.supplier}.`,
      rows: sup.map(s => ({ label: s.supplier, value: fmtSAR(s.spend) }))
    }
  }
  // category
  if (/(category|categories|فئة|فئات|نوع)/.test(q)) {
    const cats = salesByCategory(filter)
    return { answer: ar ? `المبيعات حسب الفئة:` : `Sales by category:`, rows: cats.map(c => ({ label: categoryLabel(c.key, locale), value: fmtSAR(c.v) })) }
  }
  // clients count
  if (/(how many client|number of client|كم عميل|عدد العملاء)/.test(q)) {
    const c = crmSummary()
    return { answer: ar ? `لديك ${c.total} عميلًا، منهم ${c.active} لديهم مبيعات مسجّلة.` : `You have ${c.total} clients, ${c.active} of them with recorded sales.` }
  }

  // fallback: headline summary + suggestions
  const s = salesSummary(); const p = procurementSummary()
  return {
    answer: ar
      ? `يمكنني الإجابة عن المبيعات والهامش والمستحقات والموردين والمنتجات والمناديب. ملخص: مبيعات ${fmtSAR(s.revenue)} · مشتريات ${fmtSAR(p.spend)} · مستحقات ${fmtSAR(s.outstanding)}. جرّب: "أعلى عميل" أو "مبيعات مايو" أو "من يدين لنا؟".`
      : `I can answer on sales, margin, receivables, suppliers, products and salespeople. Snapshot: sales ${fmtSAR(s.revenue)} · purchases ${fmtSAR(p.spend)} · receivables ${fmtSAR(s.outstanding)}. Try: "top client", "revenue in May", or "who owes us?".`
  }
}

// Compact data brief for the ChatGPT route (kept small to control tokens).
export function buildContext(locale: 'en' | 'ar'): string {
  const s = salesSummary(); const p = procurementSummary(); const c = crmSummary()
  const months = salesByMonth().map(m => `${m.t}:${Math.round(m.v)}`).join(', ')
  const reps = salesBySalesperson().slice(0, 5).map(r => `${r.en}:${Math.round(r.v)}`).join(', ')
  const cats = salesByCategory().map(x => `${x.key}:${Math.round(x.v)}`).join(', ')
  const margins = marginByCategory().map(m => `${m.key}:${m.marginPct}%`).join(', ')
  const topC = salesByClientName().slice(0, 10).map(x => `${x.name}:${Math.round(x.revenue)}(owes ${Math.round(x.outstanding)})`).join('; ')
  const sup = supplierSpend(8).map(x => `${x.supplier}:${Math.round(x.spend)}`).join('; ')
  const pr = profitSummary(); const col = collectionsSummary()
  const debtors = salesByClientName().filter(x => x.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding).slice(0, 6).map(x => `${x.name}:${Math.round(x.outstanding)}`).join('; ')
  return [
    `MEC (food importer/distributor, Saudi Arabia) operations data. Currency SAR. Period Oct 2025–Jun 2026.`,
    `Sales total ${Math.round(s.revenue)} (incl 15% VAT) across ${s.invoices} invoices; collected ${Math.round(s.collected)}; outstanding ${Math.round(s.outstanding)}; VAT ${Math.round(s.vat)}.`,
    `Procurement total ${Math.round(p.spend)} across ${p.suppliers} suppliers (this is total PURCHASED, not cost-of-goods-sold; the gap vs COGS is inventory + unmatched lines). Clients ${c.total} (${c.active} with sales).`,
    `Actual gross profit (per-product sell vs matched buy cost, pre-VAT) on ${pr.priced} priced products: ${Math.round(pr.grossProfit)} on ${Math.round(pr.revenue)} revenue = ${pr.marginPct}% margin; COGS ${Math.round(pr.cogs)}. Flagged: ${pr.belowMin} below minimum margin, ${pr.lossMakers} sold at a loss.`,
    `Collections: ${Math.round(col.collected)} collected vs ${Math.round(col.outstanding)} outstanding; cash ${Math.round(col.cash)}, bank ${Math.round(col.bank)}.`,
    `Sales by month: ${months}.`,
    `Sales by salesperson: ${reps}.`,
    `Sales by category: ${cats}. Gross margin by category: ${margins}.`,
    `Top clients (revenue, owed): ${topC}.`,
    `Biggest debtors (outstanding): ${debtors}.`,
    `Top suppliers (spend): ${sup}.`,
    `Minimum margin floors: meat 3%, chicken 5%, vegetables 6%, potatoes 10%.`,
    `You may compute ratios, trends, per-unit economics and recommendations from these figures. Reason it through; give a decision-useful answer in ${locale === 'ar' ? 'Arabic' : 'English'}.`
  ].join('\n')
}
