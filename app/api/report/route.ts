import { NextRequest, NextResponse } from 'next/server'
import { verifySession, SESSION_COOKIE } from '@/lib/auth/server'
import { permissionsFor } from '@/lib/auth/users'
import { BUILDERS, OVERVIEW_BUILDERS, buildSections, type ReportSpec, type Ctx } from '@/lib/report/builders'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Map a free-text request to builder ids + timeframe + title (deterministic — the LLM only writes the
// narrative). Keeps report selection reliable and honours permissions downstream.
function selectFromQuestion(q: string): { ids: string[]; days?: number; title: string } {
  const s = q.toLowerCase()
  const ids: string[] = []
  const has = (re: RegExp) => re.test(s)
  if (has(/salesperson|salesman|rep\b|مندوب|المندوب/)) ids.push('revenue_by_salesperson')
  if (has(/categor|فئة|الفئة|أصناف/)) ids.push('revenue_by_category')
  if (has(/month|شهر|الشهر|شهري/)) ids.push('revenue_by_month')
  if (has(/client|customer|عميل|العملاء/)) ids.push('top_clients')
  if (has(/collect|receivable|تحصيل|مستحق|تحصيلات/)) ids.push('collections')
  if (has(/margin|profit|هامش|ربح|أرباح/)) ids.push('products_margin')
  if (has(/inventory|stock|مخزون|المخزون|صلاحية/)) ids.push('inventory_status')
  if (has(/overdue|delayed|due|متأخر|متأخرة|استحقاق/)) ids.push('delayed_orders')
  if (has(/concern|contradiction|ملاحظ|تناقض/)) ids.push('concerns')
  if (ids.length === 0) ids.push('executive', 'revenue_by_month')
  // timeframe: "last 30 days" / "30 يوم"
  const m = s.match(/(\d{1,3})\s*(day|days|يوم|أيام)/)
  const days = m ? parseInt(m[1], 10) : undefined
  const title = q.trim().slice(0, 90) || 'Report'
  return { ids, days, title }
}

async function aiSuggestions(spec: ReportSpec, locale: 'en' | 'ar'): Promise<{ area: string; text: string }[] | undefined> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return undefined
  // compact the report into text for the model
  const lines: string[] = []
  for (const sec of spec.sections) {
    lines.push(`## ${sec.heading}`)
    if (sec.stats) lines.push(sec.stats.map(s => `${s.label}: ${s.value}`).join(' · '))
    if (sec.table) lines.push([sec.table.columns.join(' | '), ...sec.table.rows.slice(0, 8).map(r => r.join(' | '))].join('\n'))
  }
  const lang = locale === 'ar' ? 'Arabic' : 'English'
  const sys = `You are JARVIS, MEC's senior operations & finance analyst (food distributor, Saudi Arabia, SAR). Given this report, write SHORT, concrete improvement suggestions — one per section/area. Be specific and actionable (pricing, collections, stock, reorder, client risk, data quality). Reply ONLY as JSON: {"suggestions":[{"area":"<section heading>","text":"<1-2 sentence suggestion in ${lang}>"}]}.`
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: key })
    const r = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o', temperature: 0.4, max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: sys }, { role: 'user', content: lines.join('\n').slice(0, 9000) }]
    })
    const txt = r.choices[0]?.message?.content || '{}'
    const parsed = JSON.parse(txt)
    return Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 12) : undefined
  } catch { return undefined }
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value)
  if (!s) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  const perms = permissionsFor(s.r)
  let b: { question?: string; builders?: string[]; days?: number; locale?: string; title?: string; overview?: boolean }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const locale = (b.locale === 'ar' ? 'ar' : 'en') as 'en' | 'ar'

  let ids: string[]; let days = b.days; let title = b.title || 'Report'
  if (b.overview) { ids = OVERVIEW_BUILDERS; title = locale === 'ar' ? 'تقرير الشركة الشامل' : 'Company overview report' }
  else if (b.builders?.length) { ids = b.builders }
  else { const sel = selectFromQuestion(b.question || ''); ids = sel.ids; days = days ?? sel.days; title = b.title || sel.title }

  const ctx: Ctx = { locale, days }
  const sections = buildSections(ids, perms, ctx)
  if (sections.length === 0) return NextResponse.json({ error: 'no_data_or_permission' }, { status: 403 })

  const period = days ? (locale === 'ar' ? `آخر ${days} يوم` : `Last ${days} days`) : undefined
  const spec: ReportSpec = { title, period, generatedAt: new Date().toISOString(), sections }
  spec.suggestions = await aiSuggestions(spec, locale)
  return NextResponse.json({ spec, available: BUILDERS.filter(x => perms.includes(x.perm)).map(x => ({ id: x.id, label: x.label[locale] })) })
}
