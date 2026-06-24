'use client'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useRouter } from '@/i18n/navigation'
import { authenticate, setSession } from '@/lib/auth'
import { BrandLogo } from '@/components/BrandLogo'
import { Eyebrow } from '@/components/Eyebrow'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Field } from '@/components/Field'

export default function LoginPage() {
  const t = useTranslations('login'); const locale = useLocale() as 'en' | 'ar'
  const router = useRouter()
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError(t('errorRequired')); return }
    const user = authenticate(username, password)
    if (!user) { setError(t('errorInvalid')); return }
    setSession(user.username); router.replace('/control-center')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-bg">
      <div className="relative hidden lg:flex flex-col justify-between p-12 gradient-hero border-e border-border overflow-hidden">
        <div className="absolute inset-0 soft-grid soft-grid-fade" aria-hidden />
        <div className="relative"><BrandLogo size="lg" /></div>
        <div className="relative max-w-md">
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="lg" className="mt-3" locale={locale}>
            {locale === 'ar' ? 'مركز عمليات MEC' : 'MEC operations command center'}
          </DisplayHeading>
          <p className="mt-4 text-sm text-text-soft leading-relaxed">
            {locale === 'ar'
              ? 'الطلبات، الاعتمادات، المستودع، اللوجستيات، المالية وتخطيط الموردين — في نظام واحد. مبنيّ بواسطة Jarvis AI.'
              : 'Orders, approvals, warehouse, logistics, finance and supplier planning — in one system. Built by Jarvis AI.'}
          </p>
        </div>
        <div className="relative text-xs text-muted">© {locale === 'ar' ? 'وكالة Jarvis AI' : 'Jarvis AI Agency'}</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><BrandLogo size="md" /></div>
          <Eyebrow accent>{t('eyebrow')}</Eyebrow>
          <DisplayHeading size="md" className="mt-2" locale={locale}>{t('headline')}</DisplayHeading>
          <p className="mt-2 text-sm text-text-soft">{t('subline')}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <Field label={t('username')} value={username} onChange={setUsername} placeholder="f.muzaiyen" autoComplete="username" />
            <Field label={t('password')} type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" />
            {error && <p className="text-xs text-accent">{error}</p>}
            <button type="submit" className="w-full rounded-soft bg-accent text-white text-sm font-medium py-2.5 hover:bg-accent-strong shadow-soft transition-colors">{t('submit')}</button>
          </form>
          <p className="mt-5 text-xs text-muted">{t('credsHelper')}</p>
        </motion.div>
      </div>
    </div>
  )
}
