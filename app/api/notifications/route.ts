import { NextResponse } from 'next/server'
import { getSupplyIntel } from '@/lib/data/supply'

export const dynamic = 'force-dynamic'

type Bi = { en: string; ar: string }
type Note = { id: string; type: 'urgent' | 'attention' | 'update' | 'info'; title: Bi; deptName: Bi; ts: string; read: boolean; link: string }

const DEPT: Bi = { en: 'Supply intelligence', ar: 'استخبارات التوريد' }

// Derive live notifications from the supply-intelligence feed: price jumps + high/medium crises.
export async function GET() {
  const rows = await getSupplyIntel()
  const notes: Note[] = []
  for (const d of rows) {
    const po = d.price_outlook
    if (po && po.direction === 'up' && po.change_pct > 0) {
      notes.push({
        id: `si-price-${d.supplier}`,
        type: po.change_pct >= 8 ? 'urgent' : 'attention',
        title: { en: `${d.supplier}: ${d.commodity} forecast ↑ +${po.change_pct}%`, ar: `${d.supplier}: توقّع ${d.commodity} ↑ +${po.change_pct}%` },
        deptName: DEPT, ts: d.generated_at, read: false, link: '/supply-intelligence'
      })
    }
    for (const r of d.risks || []) {
      if (r.severity === 'high' || r.severity === 'medium') {
        notes.push({
          id: `si-risk-${d.supplier}-${(r.summary || '').slice(0, 24)}`,
          type: r.severity === 'high' ? 'urgent' : 'attention',
          title: { en: `${d.country} ${r.type}: ${r.summary}`, ar: `${d.country} ${r.type}: ${r.summary}` },
          deptName: DEPT, ts: d.generated_at, read: false, link: '/supply-intelligence'
        })
      }
    }
  }
  notes.sort((a, b) => (a.type === 'urgent' ? 0 : 1) - (b.type === 'urgent' ? 0 : 1) || b.ts.localeCompare(a.ts))
  return NextResponse.json(notes)
}
