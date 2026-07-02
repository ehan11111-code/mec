import { NextRequest, NextResponse } from 'next/server'
import { getWhatsappIntake } from '@/lib/data/supply'
import { getClients } from '@/lib/data/dataset'
import { nameSimilar } from '@/lib/data/core/match'
import { SELLER, buildLines, zatcaQr } from '@/lib/o2c/zatca'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/orders/:id → everything needed to render the order's PO / ZATCA invoice / delivery note:
// seller (MEC), buyer (from the client record), priced line items (from the stored margin evaluation),
// VAT + totals, and the ZATCA QR payload. Prices come from the order's own margin eval so the invoice
// matches exactly what was approved.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const msgs = await getWhatsappIntake(400)
  const order = msgs.find(m => m.message_id === id && m.intent === 'order')
  if (!order) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const marginLines: Array<{ item: string; sell: number; qty: number }> = ((order as any).raw?.margin?.lines || [])
    .map((l: any) => ({ item: l.item, sell: Number(l.sell) || 0, qty: Number(l.qty) || 0 }))
  const src = marginLines.length
    ? marginLines
    : (order.products || []).map(p => ({ item: p.name, sell: 0, qty: Number(p.qty) || 0 }))
  const { lines, net, vat, total } = buildLines(src)

  // Buyer: match the order's client to the client record (exact Arabic name, else fuzzy).
  const clients = getClients()
  const client = clients.find(c => c.nameAr === order.client_name) || clients.find(c => nameSimilar(c.nameAr, order.client_name || ''))
  const buyer = client
    ? { name: client.nameAr, cr: client.crNumber, vat: /^\d{15}$/.test(client.crNumber) ? client.crNumber : '', city: client.cityAr, account: client.accountNumber }
    : { name: order.client_name || '', cr: '', vat: '', city: '', account: '' }

  const invoiceNo = order.order_no || id.replace(/[^0-9]/g, '').slice(-10) || id
  const date = order.received_at
  const qr = zatcaQr({ sellerName: SELLER.nameAr, vat: SELLER.vat, timestamp: date, total, vatTotal: vat })

  return NextResponse.json({
    id, invoiceNo, date, salesperson: order.salesperson || order.push_name || '',
    status: order.order_status || 'pending', hasPrices: marginLines.length > 0,
    seller: SELLER, buyer, lines, net, vat, total, qr
  })
}
