import { clsx } from 'clsx'
export function DisplayHeading({ children, className, as: Tag = 'h1', size = 'lg', locale }: {
  children: React.ReactNode; className?: string; as?: 'h1' | 'h2' | 'h3'; size?: 'sm' | 'md' | 'lg' | 'xl'; locale?: string
}) {
  const sizes = { sm: 'text-xl md:text-2xl', md: 'text-2xl md:text-3xl', lg: 'text-3xl md:text-4xl', xl: 'text-4xl md:text-5xl' }
  return <Tag className={clsx(locale === 'ar' ? 'font-ar' : 'font-display', 'font-semibold tracking-tight leading-[1.1] text-text', sizes[size], className)}>{children}</Tag>
}
