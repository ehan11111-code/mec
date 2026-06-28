// Shared date/time formatters used across portal pages (orders / approvals / documents / inventory /
// operations). Pure functions — no React — so they work in client and server components alike.
// Locale 'en' | 'ar' picks the BCP-47 tag. Every formatter returns '—' for a blank/invalid date so
// callers never render "Invalid Date". Centralised here so date display is consistent everywhere and a
// formatting tweak is one edit, not ten (see .claude/skills/refactor).

export type Loc = 'en' | 'ar'
const tag = (l: Loc) => (l === 'ar' ? 'ar-SA' : 'en-GB')
const ok = (iso?: string | null): iso is string => !!iso && !isNaN(Date.parse(iso))

// "06/22" — compact day/month for dense tables (UTC parts, locale-independent).
export function fmtDayMonth(iso?: string | null): string {
  if (!ok(iso)) return '—'
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// "22 Jun" — short readable date.
export function fmtDate(iso: string | null | undefined, l: Loc): string {
  if (!ok(iso)) return '—'
  try { return new Date(iso).toLocaleDateString(tag(l), { day: '2-digit', month: 'short' }) } catch { return '—' }
}

// "22 Jun 2026" — full date with year.
export function fmtDateFull(iso: string | null | undefined, l: Loc): string {
  if (!ok(iso)) return '—'
  try { return new Date(iso).toLocaleDateString(tag(l), { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return '—' }
}

// "22/06/2026, 14:30" — date + time, for activity feeds and "latest update" lines.
export function fmtDateTime(iso: string | null | undefined, l: Loc): string {
  if (!ok(iso)) return '—'
  try { return new Date(iso).toLocaleString(tag(l), { dateStyle: 'short', timeStyle: 'short' }) } catch { return '—' }
}

// "2026-06-22 14:30 UTC" — stable absolute stamp for server-side reports (no locale, no hydration risk).
export function fmtStampUTC(iso?: string | null): string {
  if (!ok(iso)) return '—'
  return new Date(iso).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

// "just now / 5m ago / 3h ago / 2d ago" — relative hint. Pass `now` (a stable ms value from state) to
// avoid SSR/hydration mismatch; defaults to Date.now() for post-mount client use.
export function fmtAgo(iso: string | null | undefined, l: Loc, now = Date.now()): string {
  if (!ok(iso)) return '—'
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000))
  const m = Math.round(s / 60), h = Math.round(m / 60), d = Math.round(h / 24)
  const ar = l === 'ar'
  if (s < 45) return ar ? 'الآن' : 'just now'
  if (m < 60) return ar ? `قبل ${m} د` : `${m}m ago`
  if (h < 24) return ar ? `قبل ${h} س` : `${h}h ago`
  return ar ? `قبل ${d} ي` : `${d}d ago`
}
