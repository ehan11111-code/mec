import { NextRequest, NextResponse } from 'next/server'
import { getWhatsappIntake } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

// GET → WhatsApp inbox. Operational by default (archived/test rows hidden); `?all=1` includes archived
// rows for the admin automation audit log.
export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1'
  const data = await getWhatsappIntake(all ? 300 : 100, all)
  return NextResponse.json(data)
}
