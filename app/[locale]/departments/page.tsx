'use client'
import { useLocale, useTranslations } from 'next-intl'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { Eyebrow } from '@/components/Eyebrow'
import { DepartmentCard } from '@/components/DepartmentCard'
import { getFirmState } from '@/lib/mock/data'
export default function DepartmentsPage() {
  const tNav = useTranslations('nav'); const tDept = useTranslations('dept'); const locale = useLocale() as 'en' | 'ar'
  const firm = getFirmState()
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('departments') }]}>
      <header className="mb-8 max-w-3xl">
        <Eyebrow accent>{tDept('eyebrow')}</Eyebrow>
        <DisplayHeading size="lg" className="mt-3" locale={locale}>{tNav('departments')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">
          {locale === 'ar' ? 'سبعة أقسام تشغيلية تدير عمليات MEC من الطلب حتى السداد.' : 'Seven operational departments running MEC from order to payment.'}
        </p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {firm.departments.map((d, i) => <DepartmentCard key={d.slug} dept={d} locale={locale} index={i} />)}
      </div>
    </PageShell>
  )
}
