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
const hashString = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0 } return h }
const BASE_TIME = new Date('2026-05-23T09:42:00Z').getTime()
function fmtTime(t: number) { const d = new Date(t); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}` }
function fmtDateTime(t: number) { return new Date(t).toISOString() }
function fmtKpi(value: number, format: 'int' | 'pct' | 'sar' | 'ms' | 'hrs') {
  switch (format) {
    case 'int': return value >= 1000 ? value.toLocaleString('en-US') : String(Math.round(value))
    case 'pct': return `${value.toFixed(1)}%`
    case 'sar': return `SAR ${value.toFixed(1)}M`
    case 'ms': return `${Math.round(value)}ms`
    case 'hrs': return `${value.toFixed(1)}h`
  }
}
const STATUSES: Status[] = ['running', 'running', 'running', 'awaiting_approval', 'exception']
const OUTCOMES: Outcome[] = ['cleared', 'cleared', 'cleared', 'escalated', 'pending']
function rng(seedKey: string) { return mulberry32(hashString(seedKey)) }
function pickStatus(r: () => number): Status { return STATUSES[Math.floor(r() * STATUSES.length)] }
function pickOutcome(r: () => number): Outcome { return OUTCOMES[Math.floor(r() * OUTCOMES.length)] }

function buildKPIs(r: () => number, seeds: { label: Bi; format: 'int' | 'pct' | 'sar' | 'ms' | 'hrs'; range: [number, number]; highlight?: boolean }[]): KPI[] {
  return seeds.map((s) => {
    const [lo, hi] = s.range; const val = lo + r() * (hi - lo); const delta = ((r() - 0.4) * 12).toFixed(1)
    return { label: s.label, value: fmtKpi(val, s.format)!, delta: `${parseFloat(delta) >= 0 ? '+' : ''}${delta}% vs 7d`, highlight: s.highlight }
  })
}
function buildChartSeries(r: () => number, key: string, label: Bi, base: number, jitter: number, highlight = false): ChartSeries {
  const data = Array.from({ length: 14 }).map((_, i) => {
    const t = `D-${13 - i}`; const wave = Math.sin((i + r() * 4) / 2) * jitter
    const v = Math.max(0, Math.round(base + wave + (r() - 0.5) * jitter)); return { t, v }
  })
  return { key, label, data, highlight }
}
function buildChart(r: () => number, title: Bi, a: Bi, b: Bi): Chart {
  return { title, series: [buildChartSeries(r, 'a', a, 80, 30), buildChartSeries(r, 'b', b, 18, 10, true)] }
}
function fillTemplate(tpl: Bi, vars: Record<string, string | number>): Bi {
  const sub = (text: string) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? String(vars[k]) : `{${k}}`)
  return { en: sub(tpl.en), ar: sub(tpl.ar) }
}
function buildDecisions(r: () => number, templates: Bi[], count: number): Decision[] {
  const list: Decision[] = []
  for (let i = 0; i < count; i++) {
    const tpl = templates[i % templates.length]
    const tsOffset = -i * (3 + Math.floor(r() * 14)) * 60 * 1000
    const vars = { n: 4000 + Math.floor(r() * 999), m: 2000 + Math.floor(r() * 800), q: Math.floor(r() * 9 + 1) }
    list.push({ ts: fmtDateTime(BASE_TIME + tsOffset), text: fillTemplate(tpl, vars), confidence: 0.78 + r() * 0.21, outcome: pickOutcome(r) })
  } return list
}
function buildInterventions(r: () => number, templates: Bi[], count: number): Intervention[] {
  return Array.from({ length: count }).map((_, i) => {
    const tpl = templates[i % templates.length]
    const vars = { n: 4000 + Math.floor(r() * 999), m: 2000 + Math.floor(r() * 800), q: Math.floor(r() * 9 + 1) }
    const sevPool: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'medium', 'high']
    return { id: `IV-${Math.floor(r() * 9000 + 1000)}`, text: fillTemplate(tpl, vars), raisedAt: fmtDateTime(BASE_TIME - i * 17 * 60 * 1000), severity: sevPool[Math.floor(r() * sevPool.length)] }
  })
}
function buildActivity(r: () => number, templates: Bi[], count: number, dept?: string, status?: Status): ActivityEvent[] {
  return Array.from({ length: count }).map((_, i) => {
    const tpl = templates[i % templates.length]
    const vars = { n: 40 + Math.floor(r() * 460), q: 2 + Math.floor(r() * 12) }
    return { ts: fmtDateTime(BASE_TIME - i * 6 * 60 * 1000), text: fillTemplate(tpl, vars), dept, status }
  })
}
function buildSolution(deptSlug: string, seed: SolutionSeed): Solution {
  const r = rng(`${deptSlug}:${seed.slug}`); const status = pickStatus(r)
  return {
    slug: seed.slug, name: seed.name, context: seed.context, status,
    lastRun: fmtTime(BASE_TIME - Math.floor(r() * 30) * 60 * 1000),
    integratedSystems: seed.systems, kpis: buildKPIs(r, seed.kpiSeeds),
    chart: buildChart(r, seed.chartTitle, seed.chartA, seed.chartB),
    decisions: buildDecisions(r, seed.decisionTemplates, 10),
    interventions: buildInterventions(r, seed.interventionTemplates, 3 + Math.floor(r() * 3)),
    workflow: { nodes: seed.workflow, edges: [{ from: 's1', to: 'a1' }, { from: 's2', to: 'a1' }, { from: 'a1', to: 'i1' }, { from: 'i1', to: 'o1' }] },
    activity: buildActivity(r, seed.activityTemplates, 8, deptSlug, status), deployedOn: '2025-11-04'
  }
}
function buildDepartment(seed: DepartmentSeed): Department {
  const r = rng(`dept:${seed.slug}`); const solutions = seed.solutions.map((s) => buildSolution(seed.slug, s))
  const status: Status = solutions.some(s => s.status === 'exception') ? 'exception'
    : solutions.some(s => s.status === 'awaiting_approval') ? 'awaiting_approval' : 'running'
  const openExceptions = solutions.reduce((sum, s) => sum + s.interventions.length, 0)
  const activityPool: ActivityEvent[] = solutions.flatMap(s => s.activity.slice(0, 2).map(a => ({ ...a, dept: seed.slug, status: s.status })))
    .sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 10)
  return { slug: seed.slug, name: seed.name, contextLine: seed.contextLine, kpis: buildKPIs(r, seed.kpiSeeds), solutions, activity: activityPool, status, openExceptions }
}
let cached: FirmState | null = null
export function getFirmState(): FirmState {
  if (cached) return cached
  const departments = departmentSeeds.map(buildDepartment)
  const r = rng('firm')
  const workflowsRunning = departments.reduce((s, d) => s + d.solutions.length, 0)
  const interventionsRequired = departments.reduce((s, d) => s + d.openExceptions, 0)
  const integratedSystems = Array.from(new Set(departments.flatMap(d => d.solutions.flatMap(s => s.integratedSystems)))).length
  const firmKpis: KPI[] = [
    { label: { en: 'WORKFLOWS RUNNING', ar: 'تدفقات قيد التشغيل' }, value: String(workflowsRunning), delta: '+2 vs 7d' },
    { label: { en: 'DECISIONS ISSUED · 24H', ar: 'قرارات صادرة · 24س' }, value: '4,218', delta: '+6.4% vs 7d', highlight: true },
    { label: { en: 'EXCEPTIONS · OPEN', ar: 'استثناءات مفتوحة' }, value: String(interventionsRequired), delta: '−2 vs 7d' },
    { label: { en: 'INTERVENTIONS REQUIRED', ar: 'تدخلات مطلوبة' }, value: String(Math.max(3, Math.floor(interventionsRequired * 0.4))), delta: '−1 vs 7d' },
    { label: { en: 'INTEGRATED SYSTEMS', ar: 'أنظمة متكاملة' }, value: String(integratedSystems), delta: '+1 vs 30d' },
    { label: { en: 'AVG EXECUTION LATENCY', ar: 'متوسط زمن التنفيذ' }, value: '412ms', delta: '−18ms vs 7d', highlight: true }
  ]
  const globalActivity = departments.flatMap(d => d.activity.slice(0, 2)).sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 20)
  const globalInterventions = departments.flatMap(d => d.solutions.flatMap(s => s.interventions.slice(0, 1)).map(iv => ({ ...iv }))).slice(0, 8)
  const trend: Chart = {
    title: { en: 'DECISIONS vs EXCEPTIONS · 7D', ar: 'القرارات مقابل الاستثناءات · 7 أيام' },
    series: [buildChartSeries(r, 'decisions', { en: 'Decisions', ar: 'قرارات' }, 620, 80), buildChartSeries(r, 'exceptions', { en: 'Exceptions', ar: 'استثناءات' }, 22, 10, true)]
  }
  const notifications = buildNotifications(departments)
  cached = { clientName: 'MEC', firmKpis, globalActivity, globalInterventions, trend, departments, notifications }
  return cached
}
function buildNotifications(departments: Department[]): Notification[] {
  const list: Notification[] = []; let i = 0
  const r = rng('notifications')
  for (const dept of departments) {
    for (const sol of dept.solutions) {
      for (const iv of sol.interventions) {
        const type: NotificationType = iv.severity === 'high' ? 'urgent' : iv.severity === 'medium' ? 'approval' : 'attention'
        list.push({ id: `N-${1000 + i++}`, type, deptSlug: dept.slug, deptName: dept.name, title: iv.text, ts: iv.raisedAt, link: `/departments/${dept.slug}/${sol.slug}`, read: false })
      }
      const escalated = sol.decisions.filter(d => d.outcome === 'escalated').slice(0, 1)
      for (const d of escalated) list.push({ id: `N-${1000 + i++}`, type: 'attention', deptSlug: dept.slug, deptName: dept.name, title: d.text, ts: d.ts, link: `/departments/${dept.slug}/${sol.slug}`, read: false })
    }
    if (dept.solutions.length > 0) {
      const f = dept.solutions[0]
      list.push({
        id: `N-${1000 + i++}`, type: 'update', deptSlug: dept.slug, deptName: dept.name,
        title: { en: `${f.name.en} completed a daily run with ${f.kpis[0].value}.`, ar: `أنهت ${f.name.ar} جولة اليوم بمؤشر ${f.kpis[0].value}.` },
        ts: fmtDateTime(BASE_TIME - Math.floor(1 + r() * 6) * 60 * 60 * 1000), link: `/departments/${dept.slug}/${f.slug}`, read: r() > 0.5
      })
    }
  }
  return list.sort((a, b) => (a.ts < b.ts ? 1 : -1))
}
export function getDepartment(slug: string) { return getFirmState().departments.find(d => d.slug === slug) }
export function getSolution(deptSlug: string, solSlug: string) {
  const dept = getDepartment(deptSlug); if (!dept) return undefined
  const solution = dept.solutions.find(s => s.slug === solSlug); if (!solution) return undefined
  return { dept, solution }
}
