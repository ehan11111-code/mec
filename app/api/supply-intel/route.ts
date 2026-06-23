import { NextResponse } from 'next/server'
import { getSupplyIntel } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getSupplyIntel()
  return NextResponse.json(data)
}
