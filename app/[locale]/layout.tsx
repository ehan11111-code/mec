import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Inter, Manrope, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { routing } from '@/i18n/routing'
import type { Locale } from '@/i18n/routing'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-display', display: 'swap' })
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['300', '400', '500', '600'], variable: '--font-ar', display: 'swap' })

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: {
  children: React.ReactNode; params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as Locale)) notFound()
  setRequestLocale(locale)
  const messages = await getMessages()
  const dir = locale === 'ar' ? 'rtl' : 'ltr'

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning className={`${inter.variable} ${manrope.variable} ${plexArabic.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){try{var t=localStorage.getItem('portal_theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','dark');}}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();` }} />
      </head>
      <body className="bg-bg text-text font-body antialiased">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
