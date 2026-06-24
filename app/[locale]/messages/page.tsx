'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { Send, Inbox, Loader2 } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { Avatar } from '@/components/Avatar'
import { EmptyState } from '@/components/EmptyState'
import { useCurrentUser } from '@/lib/auth/useCurrentUser'
import { getAvatar } from '@/lib/auth'
import { USERS } from '@/lib/auth/users'

type Msg = { id: number; from_user: string; to_user: string; body: string; read: boolean; created_at: string }

export default function MessagesPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('messages'); const locale = useLocale() as 'en' | 'ar'
  const { user } = useCurrentUser()
  const [messages, setMessages] = useState<Msg[]>([])
  const [configured, setConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState<string>('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const colleagues = useMemo(() => user ? USERS.filter(u => u.username !== user.username) : [], [user])

  const load = useCallback(async () => {
    if (!user) return
    try {
      const d = await fetch(`/api/messages?user=${encodeURIComponent(user.username)}`).then(r => r.json())
      setConfigured(d.configured ?? true)
      if (Array.isArray(d.messages)) setMessages(d.messages)
    } catch { /* keep last */ }
    setLoading(false)
  }, [user])

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id) }, [load])
  useEffect(() => { if (!active && colleagues[0]) setActive(colleagues[0].username) }, [colleagues, active])
  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }) }, [active, messages])

  // mark the open thread read
  useEffect(() => {
    if (!user || !active) return
    const hasUnread = messages.some(m => m.to_user === user.username && m.from_user === active && !m.read)
    if (hasUnread) fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: user.username, markReadWith: active }) }).then(load).catch(() => {})
  }, [active, messages, user, load])

  if (!user) return <PageShell breadcrumbs={[]}><div /></PageShell>

  const thread = messages.filter(m => (m.from_user === user.username && m.to_user === active) || (m.from_user === active && m.to_user === user.username))
  const unreadFrom = (u: string) => messages.filter(m => m.to_user === user.username && m.from_user === u && !m.read).length
  const lastWith = (u: string) => { const ms = messages.filter(m => m.from_user === u || m.to_user === u); return ms[ms.length - 1] }
  const activeUser = colleagues.find(c => c.username === active)

  const send = async () => {
    const body = draft.trim(); if (!body || !activeUser) return
    setSending(true)
    const optimistic: Msg = { id: Date.now(), from_user: user.username, to_user: active, body, read: true, created_at: new Date().toISOString() }
    setMessages(m => [...m, optimistic]); setDraft('')
    try { await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: user.username, to: active, body }) }) } catch { /* ignore */ }
    await load(); setSending(false)
  }
  const fmt = (s: string) => { try { return new Date(s).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-GB', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) } catch { return '' } }

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('messages') }]}>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>

      {!configured && (
        <Panel className="mb-5"><EmptyState icon={Inbox} title={t('notConfigured')} hint={t('notConfiguredHint')} source={t('source')} /></Panel>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5 md:gap-6">
        {/* colleague list */}
        <Panel bodyClassName="px-0 pb-0" title={t('team')}>
          <ul className="divide-y divide-border max-h-[560px] overflow-y-auto scrollbar-soft">
            {colleagues.map(c => {
              const unread = unreadFrom(c.username); const last = lastWith(c.username)
              return (
                <li key={c.username}>
                  <button type="button" onClick={() => setActive(c.username)}
                    className={clsx('w-full flex items-center gap-3 px-4 py-3 text-start transition-colors', active === c.username ? 'bg-accent-soft/40' : 'hover:bg-surface-elev')}>
                    <Avatar name={c.name[locale]} src={getAvatar(c.username)} color={c.color} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-text truncate">{c.name[locale]}</span>
                        {unread > 0 && <span className="shrink-0 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-accent text-white text-[10px] font-semibold">{unread}</span>}
                      </div>
                      <span className="block text-[11px] text-muted truncate">{last ? last.body : c.title[locale]}</span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Panel>

        {/* thread */}
        <Panel bodyClassName="p-0" className="min-h-[560px]"
          title={activeUser ? <span className="inline-flex items-center gap-2">{activeUser.name[locale]} <span className="text-[11px] font-normal text-muted">· {activeUser.title[locale]}</span></span> : t('selectColleague')}>
          <div className="flex flex-col h-[520px]">
            <div ref={threadRef} className="flex-1 overflow-y-auto scrollbar-soft px-4 md:px-5 py-4 space-y-3">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />…</div>
              ) : thread.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted">{t('noMessages')}</div>
              ) : thread.map(m => {
                const mine = m.from_user === user.username
                return (
                  <div key={m.id} className={clsx('flex', mine ? 'justify-end' : 'justify-start')}>
                    <div className={clsx('max-w-[78%] rounded-2xl px-3.5 py-2', mine ? 'bg-accent text-white rounded-ee-sm' : 'bg-bg-soft text-text rounded-es-sm')}>
                      <p className="text-sm leading-snug whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={clsx('text-[10px] mt-1', mine ? 'text-white/70' : 'text-muted')}>{fmt(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-border p-3 flex items-end gap-2">
              <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={1} placeholder={t('typePh')}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                className="flex-1 resize-none rounded-soft border border-border bg-bg-soft px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent transition-colors max-h-32" />
              <button type="button" onClick={send} disabled={sending || !draft.trim()} aria-label={t('send')}
                className="shrink-0 inline-flex items-center justify-center h-10 w-10 rounded-full bg-accent text-white hover:bg-accent-strong disabled:opacity-50 transition-colors">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 flip-rtl" strokeWidth={1.9} />}
              </button>
            </div>
          </div>
        </Panel>
      </div>
    </PageShell>
  )
}
