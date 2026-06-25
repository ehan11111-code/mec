import { Sparkles, AlertTriangle, Lightbulb } from 'lucide-react'

export type JarvisNote = { tone?: 'issue' | 'tip'; title: string; body: string }

// JARVIS analysis block — surfaces potential error causes and improvement suggestions on a page/report.
// Always rendered (including in print) so every downloaded report carries JARVIS's notes.
export function JarvisNotes({ title, intro, notes }: { title: string; intro?: string; notes: JarvisNote[] }) {
  if (!notes.length) return null
  return (
    <section className="mt-6 rounded-soft border border-accent/30 gradient-highlight p-5 print:break-inside-avoid">
      <div className="flex items-center gap-2 mb-1">
        <span className="inline-flex items-center justify-center h-7 w-7 rounded-soft bg-accent text-white"><Sparkles className="h-4 w-4" strokeWidth={1.9} /></span>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
      </div>
      {intro && <p className="text-xs text-text-soft mb-3 leading-relaxed">{intro}</p>}
      <ul className="space-y-2.5">
        {notes.map((n, i) => {
          const Icon = n.tone === 'tip' ? Lightbulb : AlertTriangle
          return (
            <li key={i} className="flex items-start gap-2.5">
              <Icon className={n.tone === 'tip' ? 'h-4 w-4 mt-0.5 shrink-0 text-success' : 'h-4 w-4 mt-0.5 shrink-0 text-accent'} strokeWidth={1.9} />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-text leading-snug">{n.title}</div>
                <div className="text-xs text-text-soft leading-relaxed">{n.body}</div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
