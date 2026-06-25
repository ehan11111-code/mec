import { NextRequest, NextResponse } from 'next/server'
import { reportError } from '@/lib/integrations/errors'

export const runtime = 'nodejs'

// JARVIS ChatGPT route. Activates only when OPENAI_API_KEY is set; otherwise returns 503 so the
// client falls back to the local data-engine. The compact data context is built client-side and sent
// in the request body (engine.buildContext).
export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 503 })
  let body: { question?: string; context?: string; locale?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const question = (body.question || '').slice(0, 2000)
  const context = (body.context || '').slice(0, 14000)
  const locale = body.locale === 'ar' ? 'Arabic' : 'English'
  if (!question) return NextResponse.json({ error: 'no_question' }, { status: 400 })

  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  const system = `You are JARVIS — MEC's senior operations & finance analyst (by Jarvis AI Agency) for a food importer/distributor in Saudi Arabia (meat, chicken, vegetables, potatoes). Money is SAR.

THINK before answering. Work the question through step by step in your head: do the arithmetic, connect the figures, reason about cause, risk and implication — do not just restate numbers. Then reply in ${locale}.

How to answer:
- Lead with the bottom line, then the "why" with the supporting numbers, then a concrete recommendation or next step when the question is decision-oriented (pricing, risk, what to do, who to chase).
- You MAY compute, estimate and draw conclusions from the data (ratios, trends, per-unit math, projections). When you estimate something not given directly, show the short calculation and state the assumption.
- Ground every *specific* figure in the DATA below. Do not fabricate precise numbers that aren't given or derivable — but never refuse with only "not in the data": reason from what IS available, give your best-supported answer, and flag what's uncertain.
- For hard or open-ended questions, give a real analyzed answer, not a dodge. Be sharp, concise and business-readable (short paragraphs or bullets).

DATA:
${context}`
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: key })
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 900,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question }
      ]
    })
    const answer = completion.choices[0]?.message?.content?.trim() || ''
    return NextResponse.json({ answer })
  } catch (e) {
    reportError('api/jarvis', e, 'JARVIS chat (OpenAI)').catch(() => {})
    return NextResponse.json({ error: 'openai_error', detail: String(e instanceof Error ? e.message : e) }, { status: 502 })
  }
}
