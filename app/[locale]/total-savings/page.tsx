'use client'
import { useLocale, useTranslations } from 'next-intl'
import { TrendingUp } from 'lucide-react'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { NoteCallout } from '@/components/NoteCallout'
import { EmptyState } from '@/components/EmptyState'
import { InfoTooltip } from '@/components/InfoTooltip'

export default function TotalSavingsPage() {
  const tNav = useTranslations('nav'); const t = useTranslations('savings'); const locale = useLocale() as 'en' | 'ar'
  const planned: { label: string; def: { en: string; ar: string } }[] = [
    { label: t('kTotal'), def: { en: 'Cost saved vs the old manual WhatsApp/email/Excel process.', ar: 'التكلفة الموفّرة مقابل العملية اليدوية القديمة (واتساب/بريد/إكسل).' } },
    { label: t('kHours'), def: { en: 'Staff hours reclaimed by automation.', ar: 'ساعات العمل المستردّة بفضل الأتمتة.' } },
    { label: t('kErrors'), def: { en: 'Manual errors avoided (mismatches, lost documents).', ar: 'الأخطاء اليدوية التي تم تفاديها (عدم تطابق، مستندات مفقودة).' } },
    { label: t('kCostPerOrder'), def: { en: 'Average processing cost per order.', ar: 'متوسط تكلفة معالجة الطلب الواحد.' } }
  ]
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('totalSavings') }]}>
      <header className="mb-6 max-w-3xl">
        <Eyebrow accent>{t('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{tNav('totalSavings')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('blueprintSub')}</p>
      </header>
      <NoteCallout tone="info" title={t('requirementTitle')} className="mb-8 max-w-3xl">{t('requirementBody')}</NoteCallout>
      <section className="mb-8 grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {planned.map((p, i) => (
          <div key={i} className="rounded-soft border border-border bg-surface shadow-soft p-5 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted leading-tight">
              {p.label}
              <InfoTooltip def={p.def} source={{ en: 'Computed once automations run (no data yet).', ar: 'يُحتسب بمجرد تشغيل الأتمتة (لا توجد بيانات بعد).' }} />
            </div>
            <div className="font-display font-semibold text-3xl text-muted leading-none">—</div>
          </div>
        ))}
      </section>
      <div className="rounded-soft border border-border bg-surface shadow-soft">
        <EmptyState icon={TrendingUp} title={t('emptyTitle')} hint={t('emptyHint')} source={tNav('automations')} />
      </div>
    </PageShell>
  )
}
