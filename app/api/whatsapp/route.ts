import { NextResponse } from 'next/server'
import { getWhatsappIntake } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getWhatsappIntake(100)
  return NextResponse.json(data)
}
