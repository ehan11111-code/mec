import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// JARVIS ChatGPT route. Activates only when OPENAI_API_KEY is set; otherwise returns 503 so the
// client falls back to the local data-engine. The compact data context is built client-side and sent
// in the request body (engine.buildContext).
export async function POST(req: NextRequest) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: 'no_key' }, { status: 503 })
  let body: { question?: string; context?: string; locale?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }) }
  const question = (body.question || '').slice(0, 1000)
  const context = (body.context || '').slice(0, 6000)
  if (!question) return NextResponse.json({ error: 'no_question' }, { status: 400 })

  const model = process.env.OPENAI_MODEL || 'gpt-4o'
  try {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey: key })
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: `You are JARVIS, MEC's operations assistant by Jarvis AI Agency. Use ONLY the data below. Be concise and business-readable. Never invent figures.\n\n${context}` },
        { role: 'user', content: question }
      ]
    })
    const answer = completion.choices[0]?.message?.content?.trim() || ''
    return NextResponse.json({ answer })
  } catch (e) {
    return NextResponse.json({ error: 'openai_error', detail: String(e instanceof Error ? e.message : e) }, { status: 502 })
  }
}
