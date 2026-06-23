'use client'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Sparkles, X, Send, Loader2 } from 'lucide-react'
import { answer as localAnswer, buildContext } from '@/lib/jarvis/engine'

type Msg = { role: 'user' | 'jarvis'; text: string; rows?: { label: string; value: string }[]; via?: 'data' | 'ai' }

export function JarvisPanel() {
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('jarvis')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [input, setInput] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight) }, [msgs, busy])

  const ask = async (question: string) => {
    if (!question.trim() || busy) return
    setMsgs(m => [...m, { role: 'user', text: question }])
    setInput(''); setBusy(true)
    const local = localAnswer(question, locale)
    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, locale, context: buildContext(locale) })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.answer) { setMsgs(m => [...m, { role: 'jarvis', text: data.answer, rows: local.rows, via: 'ai' }]); setBusy(false); return }
      }
    } catch { /* fall through to local */ }
    setMsgs(m => [...m, { role: 'jarvis', text: local.answer, rows: local.rows, via: 'data' }])
    setBusy(false)
  }

  const suggestions = [t('s1'), t('s2'), t('s3'), t('s4')]

  return (
    <>
      <button type="button" onClick={() => setOpen(o => !o)} aria-label="JARVIS"
        className="fixed bottom-5 end-5 z-40 inline-flex items-center gap-2 rounded-full bg-accent text-white shadow-float px-4 py-3 hover:bg-accent-strong transition-colors print:hidden">
        <Sparkles className="h-4.5 w-4.5" strokeWidth={1.8} />
        <span className="text-sm font-medium hidden sm:inline">JARVIS</span>
      </button>

      {open && (
        <div className="fixed bottom-20 end-5 z-50 w-[380px] max-w-[calc(100vw-2.5rem)] h-[540px] max-h-[calc(100vh-7rem)] rounded-soft border border-border bg-surface shadow-float flex flex-col overflow-hidden animate-fade-in print:hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-bg-soft">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-accent/15 text-accent"><Sparkles className="h-4 w-4" strokeWidth={1.8} /></span>
              <div><div className="text-sm font-semibold text-text leading-none">JARVIS</div><div className="text-[11px] text-muted mt-0.5">{t('subtitle')}</div></div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-surface-elev text-muted"><X className="h-4 w-4" strokeWidth={1.8} /></button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-soft px-4 py-4 space-y-3">
            {msgs.length === 0 && (
              <div className="text-sm text-text-soft">
                <p className="mb-3">{t('greeting')}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => ask(s)} className="rounded-full border border-border bg-bg-soft hover:border-accent hover:text-accent px-3 py-1.5 text-xs text-text-soft transition-colors">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={clsx('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={clsx('max-w-[85%] rounded-soft px-3.5 py-2.5 text-sm leading-relaxed', m.role === 'user' ? 'bg-accent text-white' : 'bg-bg-soft text-text border border-border')}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.rows && m.rows.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                      {m.rows.slice(0, 6).map((r, j) => (
                        <li key={j} className="flex items-center justify-between gap-3 text-xs"><span className="text-text-soft truncate">{r.label}</span><span className="tabular-nums font-medium text-accent shrink-0">{r.value}</span></li>
                      ))}
                    </ul>
                  )}
                  {m.role === 'jarvis' && m.via && <div className="mt-1.5 text-[10px] text-muted">{m.via === 'ai' ? t('viaAi') : t('viaData')}</div>}
                </div>
              </div>
            ))}
            {busy && <div className="flex justify-start"><div className="bg-bg-soft border border-border rounded-soft px-3.5 py-2.5"><Loader2 className="h-4 w-4 animate-spin text-accent" /></div></div>}
          </div>

          <form onSubmit={e => { e.preventDefault(); ask(input) }} className="border-t border-border p-3 flex items-center gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder={t('placeholder')}
              className="flex-1 rounded-full border border-border bg-bg px-3.5 py-2 text-sm text-text placeholder:text-muted focus:border-accent transition-colors" />
            <button type="submit" disabled={busy || !input.trim()} className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full bg-accent text-white hover:bg-accent-strong disabled:opacity-50 transition-colors"><Send className="h-4 w-4" strokeWidth={1.8} /></button>
          </form>
        </div>
      )}
    </>
  )
}
