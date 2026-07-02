import { NextResponse } from 'next/server'
import { getLiveOrders } from '@/lib/data/live-orders'

export const dynamic = 'force-dynamic'

// GET → live-orders analytics (portal + WhatsApp orders): totals, by salesperson, by client, recent.
export async function GET() {
  return NextResponse.json(await getLiveOrders(400))
}
