'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Mail, Phone, MessageCircle, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { Field } from '@/components/Field'

export default function ContactPage() {
  const tNav = useTranslations('nav'); const tC = useTranslations('contact'); const locale = useLocale() as 'en' | 'ar'
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [phone, setPhone] = useState(''); const [message, setMessage] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')

  const channels = [
    { icon: Mail, label: 'partners@jarvisksa.com' },
    { icon: Phone, label: '+966 50 090 0377' },
    { icon: MessageCircle, label: 'WhatsApp · Jarvis AI' }
  ]

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !message.trim()) return
    setState('sending')
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone, message }) })
      const d = await r.json().catch(() => ({}))
      if (r.ok && d.ok) { setState('ok'); setName(''); setEmail(''); setPhone(''); setMessage('') }
      else setState('err')
    } catch { setState('err') }
  }

  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('contact') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{tC('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{tC('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{tC('subline')}</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2">
          <Panel title={tC('formTitle')}>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label={tC('name')} value={name} onChange={setName} placeholder={tC('namePh')} />
                <Field label={tC('email')} type="email" value={email} onChange={setEmail} placeholder="name@company.com" />
              </div>
              <Field label={tC('phone')} value={phone} onChange={setPhone} placeholder="+966 5X XXX XXXX" />
              <label className="block">
                <span className="block text-xs font-medium text-text-soft mb-1.5">{tC('message')}</span>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder={tC('messagePh')}
                  className="w-full rounded-soft border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent transition-colors resize-none" />
              </label>
              <button type="submit" disabled={state === 'sending'}
                className="inline-flex items-center gap-2 rounded-soft bg-accent text-white text-sm font-medium px-5 py-2.5 hover:bg-accent-strong shadow-soft transition-colors disabled:opacity-60">
                {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}{tC('send')}
              </button>
              {state === 'ok' && <p className="flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />{tC('sentNote')}</p>}
              {state === 'err' && <p className="flex items-center gap-1.5 text-xs text-warn"><AlertTriangle className="h-3.5 w-3.5" strokeWidth={2} />{tC('errNote')}</p>}
            </form>
          </Panel>
        </div>
        <Panel title={tC('channels')}>
          <ul className="space-y-4">
            {channels.map((c, i) => {
              const Icon = c.icon
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-bg-soft text-accent"><Icon className="h-4 w-4" strokeWidth={1.6} /></span>
                  <span className="text-sm text-text-soft" dir="ltr">{c.label}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-5 text-xs text-muted leading-relaxed">{tC('routedNote')}</p>
        </Panel>
      </div>
    </PageShell>
  )
}
