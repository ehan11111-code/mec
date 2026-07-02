'use client'
import { QRCodeSVG } from 'qrcode.react'
import { BrandLogo } from '@/components/BrandLogo'

export type DocKind = 'invoice' | 'po' | 'delivery'
export type DocData = {
  id: string; invoiceNo: string; date: string; salesperson: string; status: string; hasPrices: boolean
  seller: { nameAr: string; nameEn: string; vat: string; cr: string; addressAr: string; addressEn: string; phone: string }
  buyer: { name: string; cr: string; vat: string; city: string; account: string }
  lines: { item: string; qty: number; unit: string; unitPrice: number; net: number; vat: number; total: number }[]
  net: number; vat: number; total: number; qr: string
}

const money = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const day = (iso: string) => { try { return new Date(iso).toISOString().slice(0, 10) } catch { return '—' } }
const TITLE: Record<DocKind, string> = { invoice: 'فاتورة ضريبية', po: 'أمر شراء', delivery: 'سند تسليم بضاعة' }
const SIGN: Record<DocKind, string[]> = {
  invoice: ['توقيع العميل بالاستلام', 'المستودع', 'الحسابات'],
  po: ['اعتماد المدير التجاري', 'المندوب', 'المراجع'],
  delivery: ['السائق', 'أمين المخزن', 'المراجع']
}

// The MEC-branded order document — renders a ZATCA-shaped invoice, a purchase order, or a delivery note
// from one dataset. On a WHITE sheet (paper look, prints cleanly in either theme). The ZATCA QR shows on
// the invoice only. Every document carries the "JARVIS powered" footer.
export function O2CDocument({ data, kind }: { data: DocData; kind: DocKind }) {
  const showPrices = kind !== 'delivery'
  const showTax = kind === 'invoice'
  const s = data.seller
  return (
    <div dir="rtl" className="mx-auto w-full max-w-[820px] bg-white text-gray-900 rounded-lg shadow-sm ring-1 ring-gray-200 print:ring-0 print:shadow-none print:rounded-none p-6 md:p-9">
      {/* Header: seller (start) · brand (center) · QR (end, invoice only) */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b-2 border-gray-800">
        <div className="text-[11px] leading-5 text-gray-700 min-w-0">
          <p className="text-base font-bold text-gray-900">{s.nameAr}</p>
          <p className="font-semibold">{s.nameEn}</p>
          <p>{s.addressAr}</p>
          <p>الجوال: {s.phone}</p>
          <p>الرقم الضريبي: {s.vat}</p>
          <p>السجل التجاري: {s.cr}</p>
        </div>
        <div className="shrink-0 text-center">
          <BrandLogo size="lg" variant="stacked" />
          <p className="mt-1 text-[9px] text-gray-400">Middle East Chef</p>
        </div>
        <div className="shrink-0 text-center w-[92px]">
          {showTax
            ? <><QRCodeSVG value={data.qr || ' '} size={88} level="M" className="border border-gray-200" /><p className="mt-1 text-[8px] text-gray-500">E-invoicing service</p></>
            : <div className="h-[88px]" />}
        </div>
      </div>

      <h1 className="text-center text-lg font-bold my-4">{TITLE[kind]}</h1>

      {/* Meta + buyer */}
      <div className="grid grid-cols-2 gap-3 text-[11px] mb-4">
        <div className="border border-gray-300 rounded p-3 space-y-1">
          <p><span className="text-gray-500">رقم {kind === 'po' ? 'الأمر' : kind === 'delivery' ? 'السند' : 'الفاتورة'}:</span> <span className="font-semibold">{data.invoiceNo}</span></p>
          <p><span className="text-gray-500">التاريخ:</span> {day(data.date)}</p>
          <p><span className="text-gray-500">المندوب:</span> {data.salesperson || '—'}</p>
          {kind === 'invoice' && <p><span className="text-gray-500">طريقة الدفع:</span> آجل</p>}
        </div>
        <div className="border border-gray-300 rounded p-3 space-y-1">
          <p><span className="text-gray-500">السادة:</span> <span className="font-semibold">{data.buyer.name || '—'}</span></p>
          {data.buyer.vat && <p><span className="text-gray-500">الرقم الضريبي:</span> {data.buyer.vat}</p>}
          {data.buyer.cr && <p><span className="text-gray-500">السجل التجاري:</span> {data.buyer.cr}</p>}
          {data.buyer.city && <p><span className="text-gray-500">المدينة:</span> {data.buyer.city}</p>}
        </div>
      </div>

      {/* Lines */}
      <table className="w-full text-[11px] border border-gray-300 border-collapse">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="border border-gray-300 px-2 py-1.5 w-8">#</th>
            <th className="border border-gray-300 px-2 py-1.5 text-start">البيان</th>
            <th className="border border-gray-300 px-2 py-1.5 w-16">الوحدة</th>
            <th className="border border-gray-300 px-2 py-1.5 w-16">الكمية</th>
            {showPrices && <th className="border border-gray-300 px-2 py-1.5 w-20">السعر</th>}
            {showPrices && <th className="border border-gray-300 px-2 py-1.5 w-24">الإجمالي</th>}
            {showTax && <th className="border border-gray-300 px-2 py-1.5 w-20">الضريبة</th>}
            {showTax && <th className="border border-gray-300 px-2 py-1.5 w-24">الصافي</th>}
          </tr>
        </thead>
        <tbody>
          {data.lines.map((l, i) => (
            <tr key={i}>
              <td className="border border-gray-300 px-2 py-1.5 text-center">{i + 1}</td>
              <td className="border border-gray-300 px-2 py-1.5" dir="auto">{l.item}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-center">{l.unit}</td>
              <td className="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{l.qty}</td>
              {showPrices && <td className="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{money(l.unitPrice)}</td>}
              {showPrices && <td className="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{money(l.net)}</td>}
              {showTax && <td className="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{money(l.vat)}</td>}
              {showTax && <td className="border border-gray-300 px-2 py-1.5 text-center tabular-nums">{money(l.total)}</td>}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals (invoice / PO) */}
      {showPrices && (
        <div className="mt-3 flex justify-start">
          <table className="text-[11px] w-64">
            <tbody>
              <tr><td className="py-1 text-gray-500">المجموع</td><td className="py-1 text-end font-semibold tabular-nums">{money(data.net)} ﷼</td></tr>
              {showTax && <tr><td className="py-1 text-gray-500">ضريبة القيمة المضافة 15%</td><td className="py-1 text-end tabular-nums">{money(data.vat)} ﷼</td></tr>}
              <tr className="border-t border-gray-300"><td className="py-1 font-bold">الإجمالي {showTax ? 'شامل الضريبة' : ''}</td><td className="py-1 text-end font-bold tabular-nums">{money(data.total)} ﷼</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 mt-10 text-[11px] text-center text-gray-600">
        {SIGN[kind].map(s2 => <div key={s2} className="pt-8 border-t border-gray-400">{s2}</div>)}
      </div>

      {/* JARVIS-powered footer */}
      <div className="mt-6 pt-3 border-t border-gray-200 flex items-center justify-center gap-2 text-[10px] text-gray-400">
        <BrandLogo size="sm" markOnly />
        <span>مُشغّل بواسطة جارفيس · JARVIS powered</span>
      </div>
    </div>
  )
}
