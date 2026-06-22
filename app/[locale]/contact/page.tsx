'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Mail, Phone, MessageCircle } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { Panel } from '@/components/Panel'
import { Field } from '@/components/Field'

export default function ContactPage() {
  const tNav = useTranslations('nav'); const tC = useTranslations('contact'); const locale = useLocale() as 'en' | 'ar'
  const [name, setName] = useState(''); const [message, setMessage] = useState(''); const [sent, setSent] = useState(false)
  const channels = [
    { icon: Mail, label: 'support@jarvisksa.com' },
    { icon: Phone, label: '+966 5X XXX XXXX' },
    { icon: MessageCircle, label: 'WhatsApp · Jarvis AI' }
  ]
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
            <form onSubmit={e => { e.preventDefault(); setSent(true) }} className="space-y-4">
              <Field label={tC('name')} value={name} onChange={setName} placeholder={tC('namePh')} />
              <label className="block">
                <span className="block text-xs font-medium text-text-soft mb-1.5">{tC('message')}</span>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} placeholder={tC('messagePh')}
                  className="w-full rounded-soft border border-border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent transition-colors resize-none" />
              </label>
              <button type="submit" className="rounded-soft bg-accent text-white text-sm font-medium px-5 py-2.5 hover:bg-accent-strong shadow-soft transition-colors">{tC('send')}</button>
              {sent && <p className="text-xs text-success">{tC('sentNote')}</p>}
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
                  <span className="text-sm text-text-soft">{c.label}</span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </PageShell>
  )
}
