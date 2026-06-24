'use client'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { clsx } from 'clsx'
import { LogOut, Camera, KeyRound, RefreshCw, Check, Copy, Inbox, ChevronDown } from 'lucide-react'
import { Link, useRouter } from '@/i18n/navigation'
import { Avatar } from './Avatar'
import {
  clearSession, getAvatar, setAvatar, effectivePassword, setPassword, generatePassword
} from '@/lib/auth'
import { useCurrentUser } from '@/lib/auth/useCurrentUser'

export function ProfileMenu() {
  const locale = useLocale() as 'en' | 'ar'
  const t = useTranslations('profile')
  const router = useRouter()
  const { user } = useCurrentUser()
  const [open, setOpen] = useState(false)
  const [pane, setPane] = useState<'menu' | 'password'>('menu')
  const [avatar, setAvatarState] = useState<string | null>(null)
  const [cur, setCur] = useState(''); const [next, setNext] = useState(''); const [msg, setMsg] = useState('')
  const [generated, setGenerated] = useState(''); const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (user) setAvatarState(getAvatar(user.username)) }, [user])
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false) } }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  useEffect(() => { if (!open) { setPane('menu'); setMsg(''); setGenerated(''); setCur(''); setNext('') } }, [open])

  if (!user) return null
  const name = user.name[locale]

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    if (f.size > 1_500_000) { setMsg(t('tooBig')); return }
    const reader = new FileReader()
    reader.onload = () => { const d = String(reader.result); setAvatar(user.username, d); setAvatarState(d); setMsg(t('photoUpdated')) }
    reader.readAsDataURL(f)
  }
  const changePw = () => {
    setMsg('')
    if (effectivePassword(user) !== cur) { setMsg(t('wrongCurrent')); return }
    if (next.length < 6) { setMsg(t('tooShort')); return }
    setPassword(user.username, next); setCur(''); setNext(''); setMsg(t('pwChanged'))
  }
  const forgot = () => { const p = generatePassword(); setPassword(user.username, p); setGenerated(p); setCopied(false); setMsg('') }
  const copy = () => { navigator.clipboard?.writeText(generated).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }).catch(() => {}) }
  const signOut = () => { clearSession(); router.replace('/login') }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface hover:bg-surface-elev ps-1 pe-2 py-1 transition-colors" aria-label={t('profile')}>
        <Avatar name={name} src={avatar} color={user.color} size={28} />
        <span className="hidden md:inline text-xs text-text-soft max-w-[120px] truncate">{name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" strokeWidth={1.7} />
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-[300px] max-w-[calc(100vw-2rem)] rounded-soft border border-border bg-surface shadow-float z-50 overflow-hidden animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-gradient-surface">
            <Avatar name={name} src={avatar} color={user.color} size={44} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text truncate">{name}</p>
              <p className="text-[11px] text-muted truncate">{user.title[locale]}</p>
              <p className="text-[11px] text-accent/80 truncate">@{user.username}</p>
            </div>
          </div>

          {pane === 'menu' ? (
            <div className="p-1.5">
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-soft hover:bg-surface-elev transition-colors">
                <Camera className="h-4 w-4 text-muted" strokeWidth={1.7} />{t('changePhoto')}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
              <button type="button" onClick={() => { setPane('password'); setMsg('') }} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-soft hover:bg-surface-elev transition-colors">
                <KeyRound className="h-4 w-4 text-muted" strokeWidth={1.7} />{t('changePassword')}
              </button>
              <Link href="/messages" onClick={() => setOpen(false)} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-soft hover:bg-surface-elev transition-colors">
                <Inbox className="h-4 w-4 text-muted" strokeWidth={1.7} />{t('inbox')}
              </Link>
              <div className="my-1.5 border-t border-border" />
              <button type="button" onClick={signOut} className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-accent hover:bg-accent-soft transition-colors">
                <LogOut className="h-4 w-4" strokeWidth={1.7} />{t('signOut')}
              </button>
              {msg && <p className="px-3 py-1.5 text-[11px] text-success">{msg}</p>}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <p className="text-xs font-medium text-text">{t('changePassword')}</p>
              <input type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder={t('currentPw')} autoComplete="current-password"
                className="w-full rounded-soft border border-border bg-bg-soft px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent transition-colors" />
              <input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder={t('newPw')} autoComplete="new-password"
                className="w-full rounded-soft border border-border bg-bg-soft px-3 py-2 text-sm text-text placeholder:text-muted focus:border-accent transition-colors" />
              <div className="flex items-center gap-2">
                <button type="button" onClick={changePw} className="inline-flex items-center gap-1.5 rounded-full bg-accent text-white px-3.5 py-1.5 text-xs font-medium hover:bg-accent-strong transition-colors">
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />{t('save')}
                </button>
                <button type="button" onClick={() => { setPane('menu'); setMsg('') }} className="rounded-full border border-border px-3.5 py-1.5 text-xs text-text-soft hover:bg-surface-elev transition-colors">{t('back')}</button>
              </div>
              <div className="border-t border-border pt-3">
                <button type="button" onClick={forgot} className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
                  <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />{t('forgot')}
                </button>
                {generated && (
                  <div className="mt-2 flex items-center justify-between gap-2 rounded-soft bg-accent-soft px-3 py-2">
                    <code className="text-sm font-semibold text-text tabular-nums">{generated}</code>
                    <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline">
                      {copied ? <Check className="h-3 w-3" strokeWidth={2} /> : <Copy className="h-3 w-3" strokeWidth={1.8} />}{copied ? t('copied') : t('copy')}
                    </button>
                  </div>
                )}
              </div>
              {msg && <p className="text-[11px] text-success">{msg}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
