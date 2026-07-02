// ZATCA (Fatoora) e-invoice helpers — DEMO-GRADE (PORTAL_AUDIT_AND_ROADMAP.md §6.4). Builds the Phase-1
// QR TLV (base64) the KSA tax authority requires on an invoice, plus the seller identity and totals. This
// is the correct SHAPE (fields + QR); LIVE clearance/reporting needs an accredited provider adapter + the
// ZATCA API key MEC will supply (kept blank for now). Pure — no dependencies.

// MEC seller identity — extracted from the real invoice `PO AND DOCS TEMPLATES/…409.pdf`.
export const SELLER = {
  nameAr: 'شركة طاهي الشرق الأوسط', nameEn: 'Middle East Chef',
  vat: '314172890300003', cr: '7051245491',
  addressAr: 'جدة 23436، حي السلامة 6715، شارع صاري فرعي 4186',
  addressEn: 'Jeddah 23436, Al-Salama District 6715, Sari Sub-Street 4186',
  phone: '0533194000'
}
export const VAT_RATE = 0.15

// One TLV field: [tag][length][value…], value length counted in UTF-8 BYTES.
function tlv(tag: number, value: string): number[] {
  const bytes = Array.from(new TextEncoder().encode(value))
  return [tag, bytes.length, ...bytes]
}
function toBase64(bytes: number[]): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let s = ''; for (const b of bytes) s += String.fromCharCode(b)
  return typeof btoa !== 'undefined' ? btoa(s) : ''
}

// ZATCA Phase-1 QR: seller name, VAT number, timestamp (ISO), invoice total (incl. VAT), VAT total.
export function zatcaQr(o: { sellerName: string; vat: string; timestamp: string; total: number; vatTotal: number }): string {
  return toBase64([
    ...tlv(1, o.sellerName), ...tlv(2, o.vat), ...tlv(3, o.timestamp),
    ...tlv(4, o.total.toFixed(2)), ...tlv(5, o.vatTotal.toFixed(2))
  ])
}

export type DocLine = { item: string; qty: number; unit: string; unitPrice: number; net: number; vat: number; total: number }

// Build line + document totals from (sell, qty). `sell` is the PRE-VAT unit price (matches the #409
// invoice: السعر × الكمية = الإجمالي pre-VAT, then 15% VAT → الصافي).
export function buildLines(rows: { item: string; sell: number; qty: number; unit?: string }[]): { lines: DocLine[]; net: number; vat: number; total: number } {
  const lines: DocLine[] = rows.map(l => {
    const net = (l.sell || 0) * (l.qty || 0)
    const vat = net * VAT_RATE
    return { item: l.item, qty: l.qty, unit: l.unit || 'كرتون', unitPrice: l.sell || 0, net, vat, total: net + vat }
  })
  const net = lines.reduce((s, x) => s + x.net, 0)
  const vat = lines.reduce((s, x) => s + x.vat, 0)
  return { lines, net, vat, total: net + vat }
}
