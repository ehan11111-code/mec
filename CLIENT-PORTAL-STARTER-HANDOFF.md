# Client Portal Starter Kit — Complete Build Handoff

> **Self-contained handoff.** Drop this file into a **new, empty Claude Code project** and say:
> *"Build the client portal scaffold per this handoff."* It contains the **full reusable source** for a
> polished, dark, enterprise-grade **client portal** (Next.js 15 + App Router) driven entirely by
> **deterministic mock data**. It is **domain-agnostic**: every page renders from one catalog file, so
> you re-skin it for *any* business by editing **one file** (`lib/mock/catalog.ts`).
>
> **Runs on localhost with zero backend.** Deploys to Vercel as-is. No database, no API keys.
>
> This is the generic engine behind the reference "Jarvis AI operations portal." Brand names are
> swappable — see §13. Bilingual (EN/AR) support is included but optional — see §12.

---

## 0. What you get (feature inventory)

- **Auth-gated workspace** (cosmetic localStorage "login" — demo only, swap for real auth later).
- **Control Center** — firm-level KPIs, a department status heat-strip, global activity log, an
  interventions queue (with working Approve/Override/Reject actions), and a trend chart.
- **Departments** — a grid of departments → each department page → each "solution/module" detail page
  with KPIs, a 14-day area chart, a **source→agent→integration→output** workflow diagram, a decision
  feed, an interventions queue, and an activity trail.
- **Notifications inbox**, **Total Savings** (financial-impact) page, **Academy** and **Contact**
  marketing pages, plus an optional faux **AI assistant** side panel.
- **Light/dark theme** toggle (CSS-variable tokens), **EN/AR i18n** with RTL, **Framer Motion**
  micro-animations, **Recharts** charts, **lucide-react** icons.
- **Deterministic data**: a seeded PRNG generates the same numbers on every reload and on Vercel — so
  the demo looks identical everywhere and never shows empty states.

**The core idea:** you almost never touch the engine or components. To make the portal about *your*
domain, you edit the **department/solution seed catalog**. The generator builds everything else.

---

## 1. Tech stack & project layout

- **Next.js 15** (App Router, RSC), **React 18**, **TypeScript** (strict).
- **Tailwind 3.4** with CSS-variable-backed colors. **Framer Motion**, **Recharts**, **lucide-react**, **clsx**.
- **next-intl** for i18n (optional — strip for single-language; §12).

```
app/
  layout.tsx                       # root metadata, returns children
  globals.css                      # design tokens + utilities (§4)
  [locale]/
    layout.tsx                     # <html>, fonts, theme bootstrap, providers
    page.tsx                       # redirect → /control-center or /login
    login/page.tsx
    control-center/page.tsx
    departments/page.tsx
    departments/[dept]/page.tsx
    departments/[dept]/[solution]/page.tsx
    notifications/page.tsx
    total-savings/page.tsx
    jarvis-academy/page.tsx        # rename to /academy for a neutral build
    contact/page.tsx
components/                        # see §7 (full source for the core set)
lib/
  auth.ts                          # localStorage demo session
  mock/
    types.ts                       # domain model (§5)
    catalog.ts                     # THE SEED DATA — edit this to re-skin (§6)
    data.ts                        # deterministic generator (§5)
    savings.ts                     # total-savings page data (optional)
i18n/
  routing.ts  navigation.ts  request.ts
messages/
  en.json   ar.json                # ar.json optional
public/assets/                     # logo / brand asset
CLAUDE.md                          # brand rules (optional; §13)
```

---

## 2. Config files (paste verbatim)

**`package.json`**
```json
{
  "name": "client-portal",
  "version": "0.1.0",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "next lint" },
  "dependencies": {
    "clsx": "2.1.1",
    "framer-motion": "11.11.17",
    "lucide-react": "0.460.0",
    "next": "^15.3.9",
    "next-intl": "^3.26.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "recharts": "2.13.3"
  },
  "devDependencies": {
    "@types/node": "22.9.0",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.49",
    "tailwindcss": "3.4.15",
    "typescript": "5.6.3"
  }
}
```

**`next.config.ts`**
```ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true }
}

export default withNextIntl(nextConfig)
```
> Single-language build (no next-intl): drop the plugin and export `nextConfig` directly.

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`postcss.config.mjs`**
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

**`tailwind.config.ts`**
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', 'bg-soft': 'var(--bg-soft)',
        surface: 'var(--surface)', 'surface-elev': 'var(--surface-elev)',
        border: 'var(--border)', 'border-strong': 'var(--border-strong)',
        text: 'var(--text)', 'text-soft': 'var(--text-soft)', muted: 'var(--muted)',
        accent: 'var(--accent)', 'accent-soft': 'var(--accent-soft)', 'accent-strong': 'var(--accent-strong)',
        success: 'var(--success)', 'success-soft': 'var(--success-soft)',
        warn: 'var(--warn)', 'warn-soft': 'var(--warn-soft)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'Manrope', '-apple-system', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', '-apple-system', 'sans-serif'],
        ar: ['var(--font-ar)', 'Segoe UI', 'sans-serif']
      },
      borderRadius: { soft: '14px', xl2: '20px' },
      boxShadow: { soft: 'var(--shadow-sm)', card: 'var(--shadow-md)', float: 'var(--shadow-lg)' },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } }
      },
      animation: {
        'fade-up': 'fade-up 480ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 360ms ease both'
      }
    }
  },
  plugins: []
}

export default config
```

---

## 3. Root layouts & i18n plumbing

**`app/layout.tsx`** (rename brand strings as needed)
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Client Portal',
  description: 'Operations portal'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
```

**`app/[locale]/layout.tsx`** — fonts, theme bootstrap (anti-FOUC), providers
```tsx
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Inter, Manrope, IBM_Plex_Sans_Arabic } from 'next/font/google'
import { routing } from '@/i18n/routing'
import type { Locale } from '@/i18n/routing'
import { ThemeProvider } from '@/components/ThemeProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-display', display: 'swap' })
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['300','400','500','600'], variable: '--font-ar', display: 'swap' })

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
          `(function(){try{var t=localStorage.getItem('portal_theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','light');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();` }} />
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
```
> The reference also wraps children in an `AssistantProvider` (optional faux-AI panel). Omit if you
> don't build the assistant. Default theme to `'dark'` in the bootstrap script for a darker brand.

**`app/[locale]/page.tsx`** — entry redirect
```tsx
'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/navigation'
import { getSession } from '@/lib/auth'

export default function LocaleIndex() {
  const router = useRouter(); const pathname = usePathname()
  useEffect(() => {
    const s = getSession()
    router.replace(s ? '/control-center' : '/login')
  }, [router, pathname])
  return <div className="min-h-screen flex items-center justify-center bg-bg"><div className="text-sm text-muted animate-pulse">Loading…</div></div>
}
```

**`i18n/routing.ts`**
```ts
import { defineRouting } from 'next-intl/routing'
export const routing = defineRouting({ locales: ['en', 'ar'], defaultLocale: 'en', localePrefix: 'always' })
export type Locale = (typeof routing.locales)[number]
```
**`i18n/navigation.ts`**
```ts
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
```
**`i18n/request.ts`**
```ts
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale
  if (!locale || !routing.locales.includes(locale as 'en' | 'ar')) locale = routing.defaultLocale
  return { locale, messages: (await import(`../messages/${locale}.json`)).default }
})
```

---

## 4. Design tokens & utilities (`app/globals.css`)

The whole look lives here. Swap `--accent` to re-brand; everything else can stay.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root, [data-theme='light'] {
  --bg:#F8F7F2; --bg-soft:#F2EFE7; --surface:#FFFFFF; --surface-elev:#FBFAF6;
  --border:#E8E5DC; --border-strong:#D7D3C7;
  --text:#1E1E1C; --text-soft:#4A4944; --muted:#8A8780;
  --accent:#F36C34; --accent-soft:rgba(243,108,52,0.10); --accent-strong:#E0571E;
  --success:#4CAF50; --success-soft:rgba(76,175,80,0.12);
  --warn:#F2A93A; --warn-soft:rgba(242,169,58,0.14);
  --shadow-sm:0 1px 2px rgba(30,30,28,.04),0 1px 1px rgba(30,30,28,.03);
  --shadow-md:0 4px 16px rgba(30,30,28,.05),0 1px 3px rgba(30,30,28,.04);
  --shadow-lg:0 16px 48px rgba(30,30,28,.08);
}
[data-theme='dark'] {
  --bg:#0F0F0E; --bg-soft:#161614; --surface:#1A1A18; --surface-elev:#221F1C;
  --border:#2A2722; --border-strong:#3A362F;
  --text:#F2F0EA; --text-soft:#C9C5BB; --muted:#8A8780;
  --accent:#F36C34; --accent-soft:rgba(243,108,52,0.16); --accent-strong:#FF7F4A;
  --success:#6BCC78; --success-soft:rgba(107,204,120,0.16);
  --warn:#F2B868; --warn-soft:rgba(242,184,104,0.18);
  --shadow-sm:0 1px 2px rgba(0,0,0,.4); --shadow-md:0 4px 16px rgba(0,0,0,.35); --shadow-lg:0 16px 48px rgba(0,0,0,.5);
}

* { border-color: var(--border); }
html, body { background: var(--bg); color: var(--text); font-family: var(--font-body), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
html { transition: background-color 280ms ease, color 280ms ease; }
[dir='rtl'] body { font-family: var(--font-ar), 'Segoe UI', sans-serif; }
::selection { background: var(--accent-soft); color: var(--text); }
button, a, input, textarea, select { outline: none; }
button:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }

.soft-grid { background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0); background-size: 28px 28px; opacity: 0.5; }
.soft-grid-fade { mask-image: radial-gradient(ellipse at center, #000 0%, transparent 70%); -webkit-mask-image: radial-gradient(ellipse at center, #000 0%, transparent 70%); }
.scrollbar-soft::-webkit-scrollbar { width: 8px; height: 8px; }
.scrollbar-soft::-webkit-scrollbar-track { background: transparent; }
.scrollbar-soft::-webkit-scrollbar-thumb { background: var(--border); border-radius: 8px; }
.scrollbar-soft::-webkit-scrollbar-thumb:hover { background: var(--border-strong); }
[dir='rtl'] .flip-rtl { transform: scaleX(-1); }
@keyframes soft-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0; } }
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.pulse-ring::after { content: ''; position: absolute; inset: -2px; border-radius: 9999px; border: 1.5px solid currentColor; animation: soft-pulse 1.8s ease-out infinite; }
```

---

## 5. Domain model & deterministic engine

**`lib/mock/types.ts`** — every page consumes these types. `Bi` = bilingual string (`{en,ar}`);
for a single-language build alias it to `string` (§12).

```ts
export type Bi = { en: string; ar: string }
export type Status = 'running' | 'awaiting_approval' | 'exception' | 'blocked'
export type Outcome = 'cleared' | 'escalated' | 'rejected' | 'pending'
export type KPI = { label: Bi; value: string; delta?: string; highlight?: boolean }
export type Decision = { ts: string; text: Bi; confidence?: number; outcome: Outcome }
export type Intervention = { id: string; text: Bi; raisedAt: string; severity: 'low' | 'medium' | 'high' }
export type ActivityEvent = { ts: string; text: Bi; dept?: string; status?: Status }
export type ChartPoint = { t: string; v: number }
export type ChartSeries = { key: string; label: Bi; data: ChartPoint[]; highlight?: boolean }
export type Chart = { title: Bi; series: ChartSeries[] }
export type NodeKind = 'source' | 'agent' | 'integration' | 'output'
export type WorkflowNode = { id: string; label: Bi; kind: NodeKind }
export type WorkflowEdge = { from: string; to: string }
export type Workflow = { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
export type Solution = {
  slug: string; name: Bi; context: Bi; status: Status; lastRun: string
  integratedSystems: string[]; kpis: KPI[]; chart: Chart
  decisions: Decision[]; interventions: Intervention[]; workflow: Workflow
  activity: ActivityEvent[]; deployedOn: string
}
export type Department = {
  slug: string; name: Bi; contextLine: Bi; kpis: KPI[]
  solutions: Solution[]; activity: ActivityEvent[]; status: Status; openExceptions: number
}
export type NotificationType = 'urgent' | 'approval' | 'attention' | 'update' | 'info'
export type Notification = {
  id: string; type: NotificationType; deptSlug: string; deptName: Bi
  title: Bi; body?: Bi; ts: string; link?: string; read: boolean
}
export type FirmState = {
  clientName: string; firmKpis: KPI[]; globalActivity: ActivityEvent[]
  globalInterventions: Intervention[]; trend: Chart; departments: Department[]; notifications: Notification[]
}
```

**`lib/mock/data.ts`** — turns the seed catalog into a fully populated `FirmState`, deterministically.
Paste verbatim (drop the `getMecState` import/block — that's reference-specific):

```ts
import type {
  ActivityEvent, Bi, Chart, ChartSeries, Decision, Department, FirmState,
  Intervention, KPI, Notification, NotificationType, Outcome, Solution, Status
} from './types'
import { departmentSeeds, type SolutionSeed, type DepartmentSeed } from './catalog'

function mulberry32(seed: number) {
  let t = seed >>> 0
  return function () {
    t += 0x6d2b79f5; let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}
const hashString = (s: string) => { let h = 2166136261; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=(h*16777619)>>>0 } return h }
const BASE_TIME = new Date('2026-05-23T09:42:00Z').getTime()
function fmtTime(t:number){ const d=new Date(t); return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}` }
function fmtDateTime(t:number){ return new Date(t).toISOString() }
function fmtKpi(value:number, format:'int'|'pct'|'sar'|'ms'|'hrs'){
  switch(format){
    case 'int': return value>=1000 ? value.toLocaleString('en-US') : String(Math.round(value))
    case 'pct': return `${value.toFixed(1)}%`
    case 'sar': return `SAR ${value.toFixed(1)}M`
    case 'ms': return `${Math.round(value)}ms`
    case 'hrs': return `${value.toFixed(1)}h`
  }
}
const STATUSES: Status[] = ['running','running','running','awaiting_approval','exception']
const OUTCOMES: Outcome[] = ['cleared','cleared','cleared','escalated','pending']
function rng(seedKey:string){ return mulberry32(hashString(seedKey)) }
function pickStatus(r:()=>number):Status{ return STATUSES[Math.floor(r()*STATUSES.length)] }
function pickOutcome(r:()=>number):Outcome{ return OUTCOMES[Math.floor(r()*OUTCOMES.length)] }

function buildKPIs(r:()=>number, seeds:{label:Bi;format:'int'|'pct'|'sar'|'ms'|'hrs';range:[number,number];highlight?:boolean}[]):KPI[]{
  return seeds.map((s)=>{ const [lo,hi]=s.range; const val=lo+r()*(hi-lo); const delta=((r()-0.4)*12).toFixed(1)
    return { label:s.label, value:fmtKpi(val,s.format)!, delta:`${parseFloat(delta)>=0?'+':''}${delta}% vs 7d`, highlight:s.highlight } })
}
function buildChartSeries(r:()=>number, key:string, label:Bi, base:number, jitter:number, highlight=false):ChartSeries{
  const data=Array.from({length:14}).map((_,i)=>{ const t=`D-${13-i}`; const wave=Math.sin((i+r()*4)/2)*jitter
    const v=Math.max(0,Math.round(base+wave+(r()-0.5)*jitter)); return {t,v} })
  return { key, label, data, highlight }
}
function buildChart(r:()=>number, title:Bi, a:Bi, b:Bi):Chart{
  return { title, series:[ buildChartSeries(r,'a',a,80,30), buildChartSeries(r,'b',b,18,10,true) ] }
}
function fillTemplate(tpl:Bi, vars:Record<string,string|number>):Bi{
  const sub=(text:string)=> text.replace(/\{(\w+)\}/g,(_,k)=> vars[k]!==undefined?String(vars[k]):`{${k}}`)
  return { en:sub(tpl.en), ar:sub(tpl.ar) }
}
function buildDecisions(r:()=>number, templates:Bi[], count:number):Decision[]{
  const list:Decision[]=[]
  for(let i=0;i<count;i++){ const tpl=templates[i%templates.length]
    const tsOffset=-i*(3+Math.floor(r()*14))*60*1000
    const vars={ n:4000+Math.floor(r()*999), m:2000+Math.floor(r()*800), q:Math.floor(r()*9+1) }
    list.push({ ts:fmtDateTime(BASE_TIME+tsOffset), text:fillTemplate(tpl,vars), confidence:0.78+r()*0.21, outcome:pickOutcome(r) })
  } return list
}
function buildInterventions(r:()=>number, templates:Bi[], count:number):Intervention[]{
  return Array.from({length:count}).map((_,i)=>{ const tpl=templates[i%templates.length]
    const vars={ n:4000+Math.floor(r()*999), m:2000+Math.floor(r()*800), q:Math.floor(r()*9+1) }
    const sevPool:('low'|'medium'|'high')[]=['low','medium','medium','high']
    return { id:`IV-${Math.floor(r()*9000+1000)}`, text:fillTemplate(tpl,vars), raisedAt:fmtDateTime(BASE_TIME-i*17*60*1000), severity:sevPool[Math.floor(r()*sevPool.length)] } })
}
function buildActivity(r:()=>number, templates:Bi[], count:number, dept?:string, status?:Status):ActivityEvent[]{
  return Array.from({length:count}).map((_,i)=>{ const tpl=templates[i%templates.length]
    const vars={ n:40+Math.floor(r()*460), q:2+Math.floor(r()*12) }
    return { ts:fmtDateTime(BASE_TIME-i*6*60*1000), text:fillTemplate(tpl,vars), dept, status } })
}
function buildSolution(deptSlug:string, seed:SolutionSeed):Solution{
  const r=rng(`${deptSlug}:${seed.slug}`); const status=pickStatus(r)
  return {
    slug:seed.slug, name:seed.name, context:seed.context, status,
    lastRun:fmtTime(BASE_TIME-Math.floor(r()*30)*60*1000),
    integratedSystems:seed.systems, kpis:buildKPIs(r,seed.kpiSeeds),
    chart:buildChart(r,seed.chartTitle,seed.chartA,seed.chartB),
    decisions:buildDecisions(r,seed.decisionTemplates,10),
    interventions:buildInterventions(r,seed.interventionTemplates,3+Math.floor(r()*3)),
    workflow:{ nodes:seed.workflow, edges:[ {from:'s1',to:'a1'},{from:'s2',to:'a1'},{from:'a1',to:'i1'},{from:'i1',to:'o1'} ] },
    activity:buildActivity(r,seed.activityTemplates,8,deptSlug,status), deployedOn:'2025-11-04'
  }
}
function buildDepartment(seed:DepartmentSeed):Department{
  const r=rng(`dept:${seed.slug}`); const solutions=seed.solutions.map((s)=>buildSolution(seed.slug,s))
  const status:Status = solutions.some(s=>s.status==='exception') ? 'exception'
    : solutions.some(s=>s.status==='awaiting_approval') ? 'awaiting_approval' : 'running'
  const openExceptions=solutions.reduce((sum,s)=>sum+s.interventions.length,0)
  const activityPool:ActivityEvent[]=solutions.flatMap(s=> s.activity.slice(0,2).map(a=>({...a,dept:seed.slug,status:s.status})))
    .sort((a,b)=>(a.ts<b.ts?1:-1)).slice(0,10)
  return { slug:seed.slug, name:seed.name, contextLine:seed.contextLine, kpis:buildKPIs(r,seed.kpiSeeds), solutions, activity:activityPool, status, openExceptions }
}
let cached: FirmState | null = null
export function getFirmState(): FirmState {
  if (cached) return cached
  const departments = departmentSeeds.map(buildDepartment)
  const r = rng('firm')
  const workflowsRunning = departments.reduce((s,d)=>s+d.solutions.length,0)
  const interventionsRequired = departments.reduce((s,d)=>s+d.openExceptions,0)
  const integratedSystems = Array.from(new Set(departments.flatMap(d=>d.solutions.flatMap(s=>s.integratedSystems)))).length
  const firmKpis: KPI[] = [
    { label:{en:'WORKFLOWS RUNNING',ar:'تدفقات قيد التشغيل'}, value:String(workflowsRunning), delta:'+2 vs 7d' },
    { label:{en:'DECISIONS ISSUED · 24H',ar:'قرارات صادرة · 24س'}, value:'4,218', delta:'+6.4% vs 7d', highlight:true },
    { label:{en:'EXCEPTIONS · OPEN',ar:'استثناءات مفتوحة'}, value:String(interventionsRequired), delta:'−2 vs 7d' },
    { label:{en:'INTERVENTIONS REQUIRED',ar:'تدخلات مطلوبة'}, value:String(Math.max(3,Math.floor(interventionsRequired*0.4))), delta:'−1 vs 7d' },
    { label:{en:'INTEGRATED SYSTEMS',ar:'أنظمة متكاملة'}, value:String(integratedSystems), delta:'+1 vs 30d' },
    { label:{en:'AVG EXECUTION LATENCY',ar:'متوسط زمن التنفيذ'}, value:'412ms', delta:'−18ms vs 7d', highlight:true }
  ]
  const globalActivity = departments.flatMap(d=>d.activity.slice(0,2)).sort((a,b)=>(a.ts<b.ts?1:-1)).slice(0,20)
  const globalInterventions = departments.flatMap(d=>d.solutions.flatMap(s=>s.interventions.slice(0,1)).map(iv=>({...iv}))).slice(0,8)
  const trend: Chart = { title:{en:'DECISIONS vs EXCEPTIONS · 7D',ar:'القرارات مقابل الاستثناءات · 7 أيام'},
    series:[ buildChartSeries(r,'decisions',{en:'Decisions',ar:'قرارات'},620,80), buildChartSeries(r,'exceptions',{en:'Exceptions',ar:'استثناءات'},22,10,true) ] }
  const notifications = buildNotifications(departments)
  cached = { clientName:'ACME CORP', firmKpis, globalActivity, globalInterventions, trend, departments, notifications }
  return cached
}
function buildNotifications(departments: Department[]): Notification[] {
  const list: Notification[] = []; let i = 0
  for (const dept of departments) {
    for (const sol of dept.solutions) {
      for (const iv of sol.interventions) {
        const type: NotificationType = iv.severity==='high'?'urgent':iv.severity==='medium'?'approval':'attention'
        list.push({ id:`N-${1000+i++}`, type, deptSlug:dept.slug, deptName:dept.name, title:iv.text, ts:iv.raisedAt, link:`/departments/${dept.slug}/${sol.slug}`, read:false })
      }
      const escalated = sol.decisions.filter(d=>d.outcome==='escalated').slice(0,1)
      for (const d of escalated) list.push({ id:`N-${1000+i++}`, type:'attention', deptSlug:dept.slug, deptName:dept.name, title:d.text, ts:d.ts, link:`/departments/${dept.slug}/${sol.slug}`, read:false })
    }
    if (dept.solutions.length>0) {
      const f=dept.solutions[0]
      list.push({ id:`N-${1000+i++}`, type:'update', deptSlug:dept.slug, deptName:dept.name,
        title:{ en:`${f.name.en} completed a daily run with ${f.kpis[0].value}.`, ar:`أنهت ${f.name.ar} جولة اليوم بمؤشر ${f.kpis[0].value}.` },
        ts:new Date(Date.now()-1000*60*60*(1+Math.random()*6)).toISOString(), link:`/departments/${dept.slug}/${f.slug}`, read:Math.random()>0.5 })
    }
  }
  return list.sort((a,b)=>(a.ts<b.ts?1:-1))
}
export function getDepartment(slug:string){ return getFirmState().departments.find(d=>d.slug===slug) }
export function getSolution(deptSlug:string, solSlug:string){
  const dept=getDepartment(deptSlug); if(!dept) return undefined
  const solution=dept.solutions.find(s=>s.slug===solSlug); if(!solution) return undefined
  return { dept, solution }
}
```

> **Why deterministic:** the seeded PRNG (`mulberry32` + FNV-1a hash, keyed by `dept:solution`) means
> identical output on every reload and on Vercel — the demo is stable and reproducible. The
> `Math.random()` calls in `buildNotifications` only affect read/unread + timestamps; replace with the
> seeded `r()` if you want 100% determinism there too.

---

## 6. The seed catalog — the ONE file you edit to re-skin (`lib/mock/catalog.ts`)

This is where the portal becomes *your* domain. Define departments, each with "solutions" (the
autonomous workflows / modules). The engine fills numbers, charts, feeds, and the workflow graph.

**Seed types + helpers:**
```ts
import type { Bi, NodeKind } from './types'

export type SolutionSeed = {
  slug: string; name: Bi; context: Bi; systems: string[]
  kpiSeeds: { label: Bi; format: 'int'|'pct'|'sar'|'ms'|'hrs'; range: [number,number]; highlight?: boolean }[]
  chartTitle: Bi; chartA: Bi; chartB: Bi
  workflow: { id: string; label: Bi; kind: NodeKind }[]   // 2×source, 1×agent, 1×integration, 1×output
  decisionTemplates: Bi[]                                  // {n}/{m}/{q} placeholders
  interventionTemplates: Bi[]
  activityTemplates: Bi[]
}
export type DepartmentSeed = {
  slug: string; name: Bi; contextLine: Bi
  kpiSeeds: { label: Bi; format: 'int'|'pct'|'sar'|'ms'|'hrs'; range: [number,number]; highlight?: boolean }[]
  solutions: SolutionSeed[]
}
const std = (id:string, en:string, ar:string, kind:NodeKind) => ({ id, label:{en,ar}, kind })
const baseWorkflow = (sA:string,sAa:string, sB:string,sBa:string, ag:string,aga:string, ig:string,iga:string, o:string,oa:string) => [
  std('s1',sA,sAa,'source'), std('s2',sB,sBa,'source'), std('a1',ag,aga,'agent'),
  std('i1',ig,iga,'integration'), std('o1',o,oa,'output')
]
```

**One fully-worked department (copy the pattern per department):**
```ts
export const departmentSeeds: DepartmentSeed[] = [
  {
    slug: 'finance',
    name: { en: 'Finance', ar: 'المالية' },
    contextLine: { en: 'Five modules live · linked to your ERP, banks and treasury.', ar: 'خمس وحدات نشطة · مرتبطة بنظام ERP والبنوك والخزينة.' },
    kpiSeeds: [
      { label: { en: 'Invoices matched today', ar: 'الفواتير المُطابَقة اليوم' }, format: 'int', range: [180, 320] },
      { label: { en: 'Cash position', ar: 'الوضع النقدي الحالي' }, format: 'sar', range: [12, 28], highlight: true },
      { label: { en: 'Receivables over 60d', ar: 'مستحقات تجاوزت 60 يومًا' }, format: 'sar', range: [1, 4] },
      { label: { en: 'Pending approvals', ar: 'موافقات بانتظارك' }, format: 'int', range: [4, 18] }
    ],
    solutions: [
      {
        slug: 'three-way-match',
        name: { en: 'Three-Way Match Agent', ar: 'وكيل المطابقة الثلاثية' },
        context: { en: 'Automates invoice / PO / receipt reconciliation.', ar: 'يؤتمت تسوية الفاتورة / أمر الشراء / الإيصال.' },
        systems: ['ERP', 'OCR', 'WMS'],
        kpiSeeds: [
          { label: { en: 'INVOICES MATCHED · 24H', ar: 'فواتير مُطابَقة · 24س' }, format: 'int', range: [180, 320] },
          { label: { en: 'AUTO-MATCH RATE', ar: 'نسبة المطابقة التلقائية' }, format: 'pct', range: [88, 97], highlight: true },
          { label: { en: 'EXCEPTIONS OPEN', ar: 'استثناءات مفتوحة' }, format: 'int', range: [4, 14] },
          { label: { en: 'AVG MATCH TIME', ar: 'متوسط زمن المطابقة' }, format: 'ms', range: [400, 1200] }
        ],
        chartTitle: { en: 'MATCH RATE vs EXCEPTIONS · 14D', ar: 'نسبة المطابقة مقابل الاستثناءات · 14 يومًا' },
        chartA: { en: 'Matched', ar: 'مُطابَق' }, chartB: { en: 'Exceptions', ar: 'استثناءات' },
        workflow: baseWorkflow('Vendor invoices','فواتير الموردين', 'POs + receipts','أوامر وإيصالات', 'Match agent','وكيل المطابقة', 'ERP posting','ترحيل ERP', 'AP ledger','سجل الموردين'),
        decisionTemplates: [{ en: 'Auto-matched INV-{n} → PO-{m}', ar: 'مطابقة تلقائية INV-{n} ← PO-{m}' }],
        interventionTemplates: [{ en: 'INV-{n} qty mismatch · approve adjustment', ar: 'عدم تطابق كمية INV-{n} · اعتماد تسوية' }],
        activityTemplates: [{ en: 'Processed {n} invoices · {q} auto-cleared', ar: 'معالجة {n} فاتورة · {q} تمت تلقائيًا' }]
      }
      // …more solutions
    ]
  }
  // …more departments
]
```

**Authoring rules:**
- Each department: a `slug`, `name`, `contextLine`, 4 `kpiSeeds`, and 4–6 `solutions`.
- Each solution: 4 `kpiSeeds` (mark the headline one `highlight: true` → renders in accent), a chart
  title + two series labels, a 5-node `workflow` (2 sources, 1 agent, 1 integration, 1 output), and
  short `decision/intervention/activity` templates using `{n}`, `{m}`, `{q}` placeholders.
- `format`: `int` (counts), `pct` (`xx.x%`), `sar` (`SAR x.xM` money), `ms` (latency), `hrs` (cycle).
  Add a `usd` case to `fmtKpi` if you want `$` money.
- The sidebar, department grid, and all detail pages are generated automatically from this array.

---

## 7. Components — full source for the core set

Place under `components/`. All are self-contained; `'use client'` where shown.

**`lib/auth.ts`** (demo session)
```ts
'use client'
const KEY = 'portal_session'
export type Session = { email: string; ts: number }
export function getSession(): Session | null {
  if (typeof window === 'undefined') return null
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) as Session : null } catch { return null }
}
export function setSession(email: string) { if (typeof window!=='undefined') localStorage.setItem(KEY, JSON.stringify({ email, ts: Date.now() })) }
export function clearSession() { if (typeof window!=='undefined') localStorage.removeItem(KEY) }
```

**`ThemeProvider.tsx`**
```tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
type Theme = 'light' | 'dark'
type Ctx = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }
const ThemeContext = createContext<Ctx | null>(null)
const KEY = 'portal_theme'
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  useEffect(() => {
    const stored = typeof window!=='undefined' ? localStorage.getItem(KEY) as Theme|null : null
    const initial: Theme = stored==='dark'||stored==='light' ? stored : 'light'
    setThemeState(initial); document.documentElement.setAttribute('data-theme', initial)
  }, [])
  const setTheme = (t: Theme) => { setThemeState(t); document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem(KEY, t) } catch {} }
  const toggle = () => setTheme(theme==='light'?'dark':'light')
  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}
export function useTheme() { const ctx = useContext(ThemeContext); if (!ctx) throw new Error('useTheme outside provider'); return ctx }
```

**`ThemeToggle.tsx`** (spec — trivial): a `'use client'` button that calls `useTheme().toggle()` and
swaps a `Sun`/`Moon` lucide icon; classes `inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-elev`.

**`LocaleToggle.tsx`** (spec — trivial; omit in single-language builds): a button that switches between
`en`/`ar` using `usePathname()`+`useRouter()` from `@/i18n/navigation`, labelled `EN`/`ع`.

**`Eyebrow.tsx`**
```tsx
import { clsx } from 'clsx'
export function Eyebrow({ children, className, accent }: { children: React.ReactNode; className?: string; accent?: boolean }) {
  return <div className={clsx('text-xs font-medium', accent ? 'text-accent' : 'text-muted', className)}>{children}</div>
}
```

**`DisplayHeading.tsx`**
```tsx
import { clsx } from 'clsx'
export function DisplayHeading({ children, className, as: Tag='h1', size='lg', locale }: {
  children: React.ReactNode; className?: string; as?: 'h1'|'h2'|'h3'; size?: 'sm'|'md'|'lg'|'xl'; locale?: string
}) {
  const sizes = { sm:'text-xl md:text-2xl', md:'text-2xl md:text-3xl', lg:'text-3xl md:text-4xl', xl:'text-4xl md:text-5xl' }
  return <Tag className={clsx(locale==='ar'?'font-ar':'font-display','font-semibold tracking-tight leading-[1.1] text-text', sizes[size], className)}>{children}</Tag>
}
```

**`RefreshAction.tsx`**
```tsx
'use client'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useLocale } from 'next-intl'
import { clsx } from 'clsx'
export function RefreshAction({ onRefresh, className, variant='icon' }: { onRefresh?: () => void; className?: string; variant?: 'icon'|'pill' }) {
  const locale = useLocale() as 'en'|'ar'
  const [spinning, setSpinning] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const label = locale==='ar'?'تحديث':'Refresh'; const justNow = locale==='ar'?'محدّث الآن':'Just refreshed'
  const handle = () => { if (spinning) return; setSpinning(true); try { onRefresh?.() } catch {}
    window.setTimeout(() => { setSpinning(false); setLastSync(justNow); window.setTimeout(()=>setLastSync(null),1800) }, 650) }
  if (variant==='pill') return (
    <button type="button" onClick={handle} disabled={spinning} aria-label={label} title={label}
      className={clsx('inline-flex items-center gap-1.5 rounded-full border border-border bg-surface hover:bg-surface-elev text-text-soft hover:text-text px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60', className)}>
      <RefreshCw className={clsx('h-3.5 w-3.5', spinning && 'animate-spin')} strokeWidth={1.7} aria-hidden />
      <span>{lastSync ?? label}</span>
    </button> )
  return (
    <button type="button" onClick={handle} disabled={spinning} aria-label={label} title={lastSync ?? label}
      className={clsx('inline-flex items-center justify-center h-8 w-8 rounded-full text-muted hover:text-accent hover:bg-bg-soft transition-colors disabled:opacity-60', className)}>
      <RefreshCw className={clsx('h-3.5 w-3.5', spinning && 'animate-spin')} strokeWidth={1.7} aria-hidden />
      <span className="sr-only">{label}</span>
    </button> )
}
```

**`Panel.tsx`** — the card primitive every panel uses
```tsx
import { clsx } from 'clsx'
import { RefreshAction } from './RefreshAction'
export function Panel({ title, subtitle, action, onRefresh, showRefresh, children, className, bodyClassName }: {
  title?: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode
  onRefresh?: () => void; showRefresh?: boolean; children: React.ReactNode; className?: string; bodyClassName?: string
}) {
  const refreshControl = showRefresh || onRefresh ? <RefreshAction onRefresh={onRefresh} /> : null
  const hasHeader = title || action || refreshControl
  return (
    <section className={clsx('rounded-soft border border-border bg-surface shadow-soft overflow-hidden flex flex-col', className)}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 px-5 md:px-6 pt-5 pb-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold text-text leading-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
          </div>
          {(action || refreshControl) && <div className="flex items-center gap-1.5 shrink-0">{action}{refreshControl}</div>}
        </header>
      )}
      <div className={clsx('flex-1', bodyClassName ?? 'px-5 md:px-6 pb-5 md:pb-6')}>{children}</div>
    </section>
  )
}
```

**`StatusPulse.tsx`**
```tsx
'use client'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import type { Status } from '@/lib/mock/types'
const STATUS_TONES: Record<Status, { dot: string; ring: string; label: string }> = {
  running: { dot:'bg-success', ring:'text-success', label:'text-success' },
  awaiting_approval: { dot:'bg-warn', ring:'text-warn', label:'text-warn' },
  exception: { dot:'bg-accent', ring:'text-accent', label:'text-accent' },
  blocked: { dot:'bg-muted', ring:'text-muted', label:'text-muted' }
}
export function StatusPulse({ status, showLabel=true, className }: { status: Status; showLabel?: boolean; className?: string }) {
  const t = useTranslations('status'); const tone = STATUS_TONES[status]
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <span className={clsx('relative inline-flex items-center justify-center', tone.ring)}>
        <span className={clsx('inline-block h-2 w-2 rounded-full', tone.dot)} aria-hidden />
        {status==='running' && <span className="absolute inset-0 pulse-ring rounded-full" aria-hidden />}
      </span>
      {showLabel && <span className={clsx('text-xs font-medium', tone.label)}>{t(status)}</span>}
    </span>
  )
}
```

**`MetricCard.tsx`** (+ `MetricRow`)
```tsx
'use client'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import type { KPI } from '@/lib/mock/types'
export function MetricCard({ kpi, locale, compact, index=0 }: { kpi: KPI; locale: 'en'|'ar'; compact?: boolean; index?: number }) {
  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.45, delay:index*0.04, ease:[0.22,1,0.36,1] }}
      className={clsx('rounded-soft border border-border bg-surface shadow-soft flex flex-col gap-2 transition-shadow hover:shadow-card', compact?'p-4':'p-5')}>
      <div className="text-xs text-muted leading-tight">{kpi.label[locale]}</div>
      <div className={clsx('font-display font-semibold tabular-nums leading-none tracking-tight', kpi.highlight?'text-accent':'text-text', compact?'text-2xl':'text-3xl md:text-[2rem]')}>{kpi.value}</div>
      {kpi.delta && <div className="text-xs text-muted">{kpi.delta}</div>}
    </motion.div>
  )
}
export function MetricRow({ kpis, locale, compact }: { kpis: KPI[]; locale: 'en'|'ar'; compact?: boolean }) {
  return (
    <div className={clsx('grid gap-3 md:gap-4', kpis.length>=6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4')}>
      {kpis.map((kpi,i)=> <MetricCard key={i} kpi={kpi} locale={locale} compact={compact} index={i} />)}
    </div>
  )
}
```

**`ChartPanel.tsx`** — themed Recharts area chart (highlight series in accent)
```tsx
'use client'
import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Chart } from '@/lib/mock/types'
import { Panel } from './Panel'
import { useTheme } from './ThemeProvider'
function paletteFor(theme: 'light'|'dark') {
  return { grid: theme==='light'?'#ECE9E1':'#2A2722', axis:'#8A8780', base: theme==='light'?'#B9B5AA':'#6E6B63',
    accent:'#F36C34', tooltipBg: theme==='light'?'#FFFFFF':'#1A1A18', tooltipBorder: theme==='light'?'#E8E5DC':'#2A2722', tooltipText: theme==='light'?'#1E1E1C':'#F2F0EA' }
}
export function ChartPanel({ chart, locale, height=240, title }: { chart: Chart; locale: 'en'|'ar'; height?: number; title?: string }) {
  const { theme } = useTheme(); const [mounted, setMounted] = useState(false)
  useEffect(()=>setMounted(true),[]); const p = paletteFor(theme)
  const data = chart.series[0].data.map((pt,i)=>{ const row: Record<string,number|string> = { t: pt.t }; chart.series.forEach(s=>{ row[s.key]=s.data[i]?.v ?? 0 }); return row })
  return (
    <Panel title={title ?? chart.title[locale]} showRefresh>
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top:8, right:8, left:-16, bottom:0 }}>
              <defs>{chart.series.map(s=>(
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.highlight?p.accent:p.base} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.highlight?p.accent:p.base} stopOpacity={0} />
                </linearGradient>))}
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke={p.grid} vertical={false} />
              <XAxis dataKey="t" tick={{ fill:p.axis, fontSize:11 }} axisLine={false} tickLine={false} reversed={locale==='ar'} />
              <YAxis tick={{ fill:p.axis, fontSize:11 }} axisLine={false} tickLine={false} orientation={locale==='ar'?'right':'left'} />
              <Tooltip cursor={{ stroke:p.accent, strokeWidth:1, strokeDasharray:'4 4' }}
                contentStyle={{ background:p.tooltipBg, border:`1px solid ${p.tooltipBorder}`, borderRadius:10, fontSize:12, color:p.tooltipText }}
                labelStyle={{ color:p.axis, fontWeight:500 }} />
              {chart.series.map(s=>(
                <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.highlight?p.accent:p.base} strokeWidth={s.highlight?2.4:1.6}
                  fill={`url(#grad-${s.key})`} name={s.label[locale]} activeDot={{ r:4, fill:s.highlight?p.accent:p.base, stroke:p.tooltipBg, strokeWidth:2 }} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center gap-5 mt-3">
        {chart.series.map(s=>(<div key={s.key} className="inline-flex items-center gap-2">
          <span className="inline-block h-1.5 w-4 rounded-full" style={{ background:s.highlight?p.accent:p.base }} aria-hidden />
          <span className="text-xs text-muted">{s.label[locale]}</span></div>))}
      </div>
    </Panel>
  )
}
```

**`DecisionFeed.tsx`**
```tsx
'use client'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import type { Decision } from '@/lib/mock/types'
import { Panel } from './Panel'
function formatTs(ts:string){ const d=new Date(ts); return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}` }
const OUTCOME_TONE: Record<string,string> = { cleared:'bg-success-soft text-success', escalated:'bg-accent-soft text-accent', rejected:'bg-bg-soft text-muted', pending:'bg-warn-soft text-warn' }
export function DecisionFeed({ decisions, locale, title, subtitle }: { decisions: Decision[]; locale:'en'|'ar'; title?:string; subtitle?:string }) {
  const t = useTranslations('outcome'); const tCommon = useTranslations('common')
  return (
    <Panel title={title} subtitle={subtitle} bodyClassName="px-0 pb-0" showRefresh>
      <ul className="divide-y divide-border">
        {decisions.map((d,i)=>(
          <motion.li key={i} initial={{ opacity:0, x: locale==='ar'?8:-8 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.35, delay:i*0.03 }}
            className="px-5 md:px-6 py-3.5 flex items-start gap-4">
            <span className="shrink-0 text-xs tabular-nums text-muted mt-0.5 w-12">{formatTs(d.ts)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text leading-snug">{d.text[locale]}</p>
              {d.confidence!==undefined && <p className="text-xs text-muted mt-0.5">{(d.confidence*100).toFixed(0)}% {tCommon('confidence')}</p>}
            </div>
            <span className={clsx('shrink-0 inline-flex items-center text-[11px] font-medium rounded-full px-2.5 py-0.5', OUTCOME_TONE[d.outcome])}>{t(d.outcome)}</span>
          </motion.li>
        ))}
      </ul>
    </Panel>
  )
}
```

**`InterventionQueue.tsx`** — with working Approve/Override/Reject + toast
```tsx
'use client'
import { useState } from 'react'
import { clsx } from 'clsx'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Pencil, XCircle, AlertCircle } from 'lucide-react'
import type { Intervention } from '@/lib/mock/types'
import { Panel } from './Panel'
const SEV_TONE: Record<string,{icon:string;bg:string}> = { high:{icon:'text-accent',bg:'bg-accent-soft'}, medium:{icon:'text-warn',bg:'bg-warn-soft'}, low:{icon:'text-muted',bg:'bg-bg-soft'} }
export function InterventionQueue({ interventions, locale, title, subtitle }: { interventions: Intervention[]; locale:'en'|'ar'; title?:string; subtitle?:string }) {
  const t = useTranslations('common'); const tSol = useTranslations('solution'); const tCtrl = useTranslations('control')
  const [resolved, setResolved] = useState<Record<string,'approved'|'override'|'rejected'>>({})
  const [toast, setToast] = useState<string|null>(null)
  const act = (id:string, kind:'approved'|'override'|'rejected') => { setResolved(r=>({...r,[id]:kind})); setToast(tSol('actionApplied')); setTimeout(()=>setToast(null),2400) }
  return (
    <Panel title={title} subtitle={subtitle} bodyClassName="px-0 pb-0" showRefresh>
      {interventions.length===0 && <p className="px-5 md:px-6 py-8 text-sm text-muted text-center">{tCtrl('noInterventions')}</p>}
      <ul className="divide-y divide-border">
        {interventions.map((iv)=>{ const done=resolved[iv.id]; const tone=SEV_TONE[iv.severity]
          return (
            <li key={iv.id} className="px-5 md:px-6 py-4 flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={clsx('shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full', tone.bg)}><AlertCircle className={clsx('h-4 w-4', tone.icon)} strokeWidth={1.6} /></span>
                <div className="min-w-0"><p className="text-sm text-text leading-snug">{iv.text[locale]}</p><p className="text-xs text-muted mt-1">{iv.id}</p></div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {done ? <span className="inline-flex items-center text-xs font-medium text-success bg-success-soft rounded-full px-3 py-1">{done}</span> : (<>
                  <ActionBtn label={t('approve')} onClick={()=>act(iv.id,'approved')} icon={CheckCircle2} primary />
                  <ActionBtn label={t('override')} onClick={()=>act(iv.id,'override')} icon={Pencil} />
                  <ActionBtn label={t('reject')} onClick={()=>act(iv.id,'rejected')} icon={XCircle} />
                </>)}
              </div>
            </li>
          )})}
      </ul>
      <AnimatePresence>{toast && <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} className="px-5 md:px-6 py-3 border-t border-border text-xs text-success bg-success-soft">{toast}</motion.div>}</AnimatePresence>
    </Panel>
  )
}
function ActionBtn({ label, onClick, icon: Icon, primary }: { label:string; onClick:()=>void; icon: typeof CheckCircle2; primary?: boolean }) {
  return <button type="button" onClick={onClick} className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all', primary?'bg-accent text-white hover:bg-accent-strong shadow-soft':'border border-border bg-surface text-text-soft hover:bg-surface-elev hover:text-text')}><Icon className="h-3.5 w-3.5" strokeWidth={1.6} />{label}</button>
}
```

**`ActivityTrail.tsx`**
```tsx
import type { ActivityEvent } from '@/lib/mock/types'
import { Panel } from './Panel'
import { StatusPulse } from './StatusPulse'
function formatTs(ts:string){ const d=new Date(ts); return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}` }
export function ActivityTrail({ events, locale, title, subtitle, showDept=false, maxHeight }: {
  events: ActivityEvent[]; locale:'en'|'ar'; title?:string; subtitle?:string; showDept?:boolean; maxHeight?:number
}) {
  return (
    <Panel title={title} subtitle={subtitle} bodyClassName="px-0 pb-0" showRefresh>
      <ul className="divide-y divide-border overflow-y-auto scrollbar-soft" style={maxHeight?{maxHeight}:undefined}>
        {events.map((e,i)=>(
          <li key={i} className="px-5 md:px-6 py-3 flex items-start gap-4">
            <span className="shrink-0 text-xs tabular-nums text-muted mt-0.5 w-12">{formatTs(e.ts)}</span>
            {e.status && <StatusPulse status={e.status} showLabel={false} className="mt-1.5" />}
            <div className="flex-1 min-w-0"><p className="text-sm text-text leading-snug">{e.text[locale]}</p>{showDept && e.dept && <p className="text-xs text-muted mt-0.5">{e.dept}</p>}</div>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
```

**`WorkflowDiagram.tsx`** — source → agent → integration → output, 4 columns
```tsx
'use client'
import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import { Database, Cpu, Plug, CheckCheck } from 'lucide-react'
import type { Workflow } from '@/lib/mock/types'
import { Panel } from './Panel'
const COLS: Record<string,number> = { source:0, agent:1, integration:2, output:3 }
const COL_LABEL: Record<string,{en:string;ar:string}> = { source:{en:'Sources',ar:'المصادر'}, agent:{en:'Agent',ar:'الوكيل'}, integration:{en:'Integrations',ar:'التكامل'}, output:{en:'Output',ar:'الناتج'} }
const ICON: Record<string, typeof Database> = { source:Database, agent:Cpu, integration:Plug, output:CheckCheck }
export function WorkflowDiagram({ workflow, title, subtitle }: { workflow: Workflow; title?:string; subtitle?:string }) {
  const locale = (useLocale() as 'en'|'ar') ?? 'en'
  const byCol = useMemo(()=>{ const cols: Record<number, typeof workflow.nodes> = {0:[],1:[],2:[],3:[]}; workflow.nodes.forEach(n=>{ cols[COLS[n.kind]].push(n) }); return cols }, [workflow.nodes])
  return (
    <Panel title={title} subtitle={subtitle} showRefresh>
      <div className="relative grid grid-cols-4 gap-3 md:gap-5 [direction:ltr]">
        {[0,1,2,3].map((c,ci)=>{ const kind=Object.keys(COLS).find(k=>COLS[k]===c)!; const Icon=ICON[kind]
          return (
            <div key={c} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs text-muted"><Icon className="h-3.5 w-3.5" strokeWidth={1.6} /><span>{COL_LABEL[kind][locale]}</span></div>
              {byCol[c].map((n,ni)=>(
                <motion.div key={n.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:ci*0.1+ni*0.05, ease:[0.22,1,0.36,1] }}
                  className={'relative rounded-soft border bg-surface-elev px-3.5 py-3 '+(kind==='agent'?'border-accent/40 shadow-card':'border-border shadow-soft')}>
                  <div className="text-xs md:text-sm text-text leading-snug" dir={locale==='ar'?'rtl':'ltr'}>{n.label[locale]}</div>
                  {kind==='agent' && <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full bg-accent shadow-soft" aria-hidden />}
                </motion.div>
              ))}
            </div>
          )})}
      </div>
    </Panel>
  )
}
```

**`DepartmentCard.tsx`**, **`SolutionStatusCard.tsx`**, **`DeptHeatStrip.tsx`** — grid/link cards.
(Full source available in the reference repo; behavior: each is a `Link` to its route, shows a
`StatusPulse`, a name heading, a context line, and a 1–2 metric footer. `DeptHeatStrip` is a compact
grid of department tiles for the Control Center. They read `dept.name[locale]`, `dept.solutions.length`,
`dept.openExceptions`, and a solution's first KPI.)

**`BrandLogo.tsx`** — wordmark + an inline SVG "mark". For a generic build, replace the wordmark text
and the SVG with the client's logo. The reference uses an orange hex-circuit SVG mark + `JARVIS AI`
wordmark (accent on `AI`). Sizes `sm|md|lg`, `markOnly` and `variant: horizontal|stacked` props.

**`AuthGate.tsx`**
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { getSession } from '@/lib/auth'
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const [ready, setReady] = useState(false)
  useEffect(()=>{ const s=getSession(); if(!s) router.replace('/login'); else setReady(true) }, [router])
  if (!ready) return <div className="min-h-screen flex items-center justify-center bg-bg"><div className="text-sm text-muted animate-pulse">Loading workspace…</div></div>
  return <>{children}</>
}
```

**`PageShell.tsx`** — the authenticated layout wrapper used by every inner page
```tsx
import { AuthGate } from './AuthGate'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'
export function PageShell({ breadcrumbs, children }: { breadcrumbs: { label: string; href?: string }[]; children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen bg-bg">
        <SidebarNav />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar breadcrumbs={breadcrumbs} />
          <main className="flex-1 px-4 md:px-6 lg:px-8 py-6 md:py-8 scrollbar-soft">{children}</main>
        </div>
      </div>
    </AuthGate>
  )
}
```
> The reference also mounts an `AssistantLauncher` + `AssistantPanel` here (optional faux AI). Omit if not building it.

**`TopBar.tsx`** — breadcrumbs + session chip + theme/locale toggles + sign-out
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { clearSession, getSession } from '@/lib/auth'
import { LocaleToggle } from './LocaleToggle'
import { ThemeToggle } from './ThemeToggle'
import { LogOut, ChevronRight } from 'lucide-react'
import { getFirmState } from '@/lib/mock/data'
export function TopBar({ breadcrumbs }: { breadcrumbs: { label: string; href?: string }[] }) {
  const router = useRouter(); const locale = useLocale() as 'en'|'ar'
  const [email, setEmail] = useState('demo@user'); const firm = getFirmState()
  useEffect(()=>{ const s=getSession(); if(s?.email) setEmail(s.email) }, [])
  return (
    <div className="border-b border-border bg-bg/85 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 px-5 md:px-8 py-3.5">
        <nav aria-label="breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-1.5 text-sm text-muted overflow-hidden">
            {breadcrumbs.map((c,i)=>(<li key={i} className="flex items-center gap-1.5 truncate">{i>0 && <ChevronRight className="h-3.5 w-3.5 text-muted/60 flip-rtl" strokeWidth={1.6} />}<span className={i===breadcrumbs.length-1?'text-text font-medium':''}>{c.label}</span></li>))}
          </ol>
        </nav>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" aria-hidden />
            <span className="text-xs text-text-soft">{email}</span><span className="text-xs text-muted">·</span><span className="text-xs text-muted">{firm.clientName}</span>
          </div>
          <ThemeToggle /><LocaleToggle />
          <button type="button" onClick={()=>{ clearSession(); router.replace('/login') }} className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-surface hover:bg-surface-elev transition-colors" aria-label={locale==='ar'?'تسجيل الخروج':'Sign out'}>
            <LogOut className="h-4 w-4 text-text-soft" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </div>
  )
}
```
> Remove `NotificationBadge` / `AssistantTopBarButton` lines if you don't build those features.

**`SidebarNav.tsx`** — left nav, auto-built from the catalog. The departments group expands to one
child link per department. Keep this structure:
```tsx
'use client'
import { Link, usePathname } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { clsx } from 'clsx'
import { LayoutDashboard, Network, GraduationCap, Mail, ChevronDown, Bell, Coins } from 'lucide-react'
import { BrandLogo } from './BrandLogo'
import { departmentSeeds } from '@/lib/mock/catalog'
import { getFirmState } from '@/lib/mock/data'
import { useState } from 'react'
// items = [ control-center, departments(children=departmentSeeds.map(slug→/departments/slug)),
//           total-savings, notifications(badge=unread), academy, contact ]
// Active item: pathname === href || startsWith(href+'/'); active gets bg-surface + text-accent icon.
// Collapsible children under /departments with a ChevronDown toggle. See reference for full JSX.
export function SidebarNav() { /* …full source in reference repo… */ }
```
Behavioral spec (sufficient to rebuild): `aside` `w-64`, `bg-bg-soft`, `border-e`. Logo top-left links
to `/control-center`. Each nav row: icon + label, active state `bg-surface text-text shadow-soft` with
an accent icon; inactive `text-text-soft hover:bg-surface/60`. Department children render in an indented
list with an `border-s` rail. A small "Demo workspace" pill sits at the bottom.

---

## 8. Pages (compose the components)

**`login/page.tsx`** — branded split screen: `soft-grid` background, `BrandLogo`, a card with eyebrow +
`DisplayHeading` + two `Field` inputs (email/password) + an accent submit button. On submit:
`setSession(email)` then `router.replace('/control-center')`. **Any email/password works (demo).**

**`control-center/page.tsx`**
```tsx
'use client'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { PageShell } from '@/components/PageShell'
import { DisplayHeading } from '@/components/DisplayHeading'
import { MetricRow } from '@/components/MetricCard'
import { DeptHeatStrip } from '@/components/DeptHeatStrip'
import { ActivityTrail } from '@/components/ActivityTrail'
import { InterventionQueue } from '@/components/InterventionQueue'
import { ChartPanel } from '@/components/ChartPanel'
import { getFirmState } from '@/lib/mock/data'
export default function ControlCenterPage() {
  const t = useTranslations('control'); const tNav = useTranslations('nav'); const locale = useLocale() as 'en'|'ar'
  const firm = getFirmState()
  return (
    <PageShell breadcrumbs={[{ label: tNav('operations') }, { label: tNav('controlCenter') }]}>
      <motion.header initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, ease:[0.22,1,0.36,1] }} className="mb-8 md:mb-10 max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-success-soft text-success px-3 py-1 text-xs font-medium"><span className="inline-block h-1.5 w-1.5 rounded-full bg-success animate-pulse" />{t('eyebrow')}</div>
        <DisplayHeading size="lg" className="mt-4" locale={locale}>{t('headline')}</DisplayHeading>
        <p className="text-base text-text-soft mt-3 leading-relaxed">{t('subline')}</p>
      </motion.header>
      <section className="mb-8 md:mb-10"><MetricRow kpis={firm.firmKpis} locale={locale} /></section>
      <section className="mb-8 md:mb-10"><DeptHeatStrip departments={firm.departments} title={t('deptHeat')} subtitle={t('deptHeatSub')} /></section>
      <section className="mb-8 md:mb-10 grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
        <ActivityTrail events={firm.globalActivity} locale={locale} title={t('executionLog')} subtitle={t('executionLogSub')} showDept maxHeight={420} />
        <InterventionQueue interventions={firm.globalInterventions} locale={locale} title={t('interventionsRequired')} subtitle={t('interventionsRequiredSub')} />
      </section>
      <section><ChartPanel chart={firm.trend} locale={locale} height={280} /></section>
    </PageShell>
  )
}
```

**`departments/page.tsx`** — header + a responsive grid of `DepartmentCard` over `getFirmState().departments`.

**`departments/[dept]/page.tsx`** — resolve `params`, `getDepartment(slug)` (→ `notFound()` if missing),
render header + `MetricRow` of dept KPIs + a grid of `SolutionStatusCard` + `ActivityTrail`.
(Uses `const { dept: deptSlug } = use(params)` — params is a Promise in Next 15.)

**`departments/[dept]/[solution]/page.tsx`** — the richest page: `getSolution(dept, sol)` then header
(back link, heading, context), a status strip (StatusPulse + last run + connected-systems chips),
`MetricRow`, `ChartPanel` (height 300), a two-col `DecisionFeed` + `InterventionQueue`,
`WorkflowDiagram`, `ActivityTrail`, and a footer with module id + deployed date. Full source captured
in §ref; the Control-Center and dept pages above show the exact composition idiom to follow.

**Secondary pages** (`notifications`, `total-savings`, `jarvis-academy`, `contact`) — standard
`PageShell` pages. Notifications renders `firm.notifications` with type chips + filters and a "mark all
read" action. Total-Savings reads `lib/mock/savings.ts` (a similar seeded data module — financial-impact
KPIs, with-vs-without comparison chart, per-department breakdown). Academy + Contact are simple
marketing pages with demo-only forms. Build these last; the portal is fully functional without them.

---

## 9. Translation messages (`messages/en.json`)

next-intl namespaces the UI strings. Minimal set the core pages need (extend as you add pages):
```json
{
  "brand": { "name": "ACME", "positioning": "Your tagline here." },
  "nav": { "operations": "Operations", "controlCenter": "Control center", "departments": "Departments", "notifications": "Notifications", "totalSavings": "Total savings", "academy": "Academy", "contact": "Contact" },
  "common": { "demoBanner": "Demo workspace", "lastRun": "Last run", "deployed": "Deployed", "moduleId": "Module", "integratedSystems": "Connected", "approve": "Approve", "override": "Override", "reject": "Reject", "confidence": "confidence" },
  "status": { "running": "Live", "awaiting_approval": "Awaiting approval", "exception": "Needs attention", "blocked": "Paused" },
  "outcome": { "cleared": "Cleared", "escalated": "Escalated", "rejected": "Rejected", "pending": "Pending" },
  "login": { "eyebrow": "System ready", "headline": "Welcome back", "subline": "Sign in to your workspace.", "email": "Email", "password": "Password", "submit": "Sign in", "demoHelper": "Demo · any email and password works.", "errorRequired": "Please enter your email and password." },
  "control": { "eyebrow": "All systems live", "headline": "Operations overview", "subline": "Every module running across your company today.", "deptHeat": "Departments", "deptHeatSub": "Status at a glance.", "executionLog": "Recent activity", "executionLogSub": "What the system has been doing.", "interventionsRequired": "Needs your input", "interventionsRequiredSub": "Decisions waiting on a human.", "noInterventions": "Nothing waiting." },
  "depts": { "solutions": "Modules", "openExceptions": "Open exceptions" },
  "dept": { "eyebrow": "Department", "kpiRow": "Department snapshot", "modules": "Live modules", "activity": "Recent activity", "activitySub": "Latest events." },
  "solution": { "kpiRow": "Snapshot", "decisions": "Decisions issued", "decisionsSub": "Recent autonomous decisions.", "interventions": "Needs your input", "interventionsSub": "Flagged for human review.", "workflow": "How it's wired", "workflowSub": "Sources, agent, integrations, outputs.", "activity": "Activity log", "backTo": "Back to {dept}", "actionApplied": "Done · recorded in this demo." }
}
```
Provide a matching `ar.json` only if bilingual. Components reference these keys exactly — keep them in sync.

---

## 10. Run locally

```bash
npm install
npm run dev      # http://localhost:3000  → redirects to /en/login
```
Log in with any email/password → `/en/control-center`. Click into Departments → a department → a module.

**Build check before deploy:** `npm run build` must pass with **zero type errors**. Common gotchas:
the `Bi` indexing (`x[locale]`) and the `params` Promise (`use(params)`).

---

## 11. Deploy to Vercel

1. `git init`, commit, push to a new GitHub repo. `.gitignore` must exclude `node_modules`, `.next`, `*.log`.
2. vercel.com → New Project → Import the repo. Framework auto-detected as **Next.js**; no config needed.
3. **No environment variables** — all data is local and seeded.
4. Deploy. The production URL renders identically to localhost (deterministic data → exact parity).

---

## 12. Single-language (English-only) variant

If you don't need Arabic:
- `i18n/routing.ts`: `locales: ['en']`. Remove `LocaleToggle`, the Arabic font, and `dir='rtl'` logic.
- Simplest type change: `export type Bi = string` in `types.ts`, then replace `x[locale]` / `.en` with
  the value directly across components (grep `\[locale\]` and `\.en\b`). Remove `useLocale`.
- Or keep next-intl with only `'en'` (least churn) and leave `Bi = {en, ar}` with `ar` mirroring `en`.

---

## 13. Re-brand checklist (make it yours)

1. **Accent color** — change `--accent` (+ `--accent-soft`/`--accent-strong`) in `globals.css`. One swap re-themes everything.
2. **Logo** — replace `BrandLogo.tsx`'s SVG/wordmark and drop the client asset in `public/assets/`.
3. **Copy** — edit `messages/en.json` (`brand`, `nav`, headlines) and the `metadata` in `app/layout.tsx`.
4. **`clientName`** — set in `getFirmState()` (shows in the TopBar chip).
5. **Catalog** — rewrite `lib/mock/catalog.ts` with the client's departments + modules (§6). This is the real work.
6. **Optional brand kit** — if you have a `CLAUDE.md` brand-rules file, drop it at the repo root so the
   agent applies the brand system consistently (the reference ships a full Jarvis brand kit this way).
7. **Trim** — delete pages/features you don't need (assistant, total-savings, academy). The core
   (login → control-center → departments → solution) stands alone.

---

## 14. What's deliberately NOT included (and how to add later)

- **Real auth** — replace `lib/auth.ts` + `AuthGate` with Supabase Auth / NextAuth. Keep `AuthGate` as the single choke point.
- **Real data** — keep `getFirmState/getDepartment/getSolution` as the only data boundary; later make
  them fetch real platform data that returns the same `FirmState`/`Department`/`Solution` shapes. Hold
  secrets in Vercel env vars / server routes — never in the browser.
- **The faux AI assistant** — the reference has an `assistant/` panel with canned responses; optional polish.

**Golden rule:** the UI never knows the data is mock. Swap the three accessor functions in `data.ts`
for real sources and every page keeps working unchanged.
```
