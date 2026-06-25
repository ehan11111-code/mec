import { NextResponse } from 'next/server'
import { getEmailIntake } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

export async function GET() {
  const data = await getEmailIntake(200)
  return NextResponse.json(data)
}
