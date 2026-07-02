'use client'
import { useLocale, useTranslations } from 'next-intl'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { LiveOrdersAnalytics } from '@/components/LiveOrdersAnalytics'

export default function LiveOrdersPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('liveOrders'); const locale = useLocale() as 'en' | 'ar'
  return (
    <PageShell requires="orders" breadcrumbs={[{ label: tNav('secSales') }, { label: tNav('liveOrders') }]}>
      <header className="mb-7 max-w-2xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </header>
      <LiveOrdersAnalytics />
    </PageShell>
  )
}
