import type {
  ActivityEvent, Bi, Chart, Department, FirmState, Intervention, KPI, Notification, Solution, Status
} from './types'
import { departmentSeeds, type SolutionSeed, type DepartmentSeed } from './catalog'

// NOTE: all fabricated/mock numbers have been removed. The operational modules below are presented as
// a BLUEPRINT — names, purpose (requirement) and the planned workflow — with no invented metrics.
// Every KPI reads "—" until the module is connected to a real source. Real figures live only in the
// data-driven sections (Analytics / Orders / Clients) sourced from MEC's actual files.

const EMPTY = '—'
function plannedKPIs(seeds: { label: Bi }[]): KPI[] {
  return seeds.map((s) => ({ label: s.label, value: EMPTY }))
}
function emptyChart(title: Bi, a: Bi, b: Bi): Chart {
  return { title, series: [{ key: 'a', label: a, data: [] }, { key: 'b', label: b, data: [], highlight: true }] }
}

function buildSolution(_deptSlug: string, seed: SolutionSeed): Solution {
  return {
    slug: seed.slug, name: seed.name, context: seed.context, status: 'planned',
    lastRun: EMPTY, integratedSystems: seed.systems, kpis: plannedKPIs(seed.kpiSeeds),
    chart: emptyChart(seed.chartTitle, seed.chartA, seed.chartB),
    decisions: [], interventions: [],
    workflow: { nodes: seed.workflow, edges: [{ from: 's1', to: 'a1' }, { from: 's2', to: 'a1' }, { from: 'a1', to: 'i1' }, { from: 'i1', to: 'o1' }] },
    activity: [], deployedOn: EMPTY
  }
}
function buildDepartment(seed: DepartmentSeed): Department {
  const solutions = seed.solutions.map((s) => buildSolution(seed.slug, s))
  return { slug: seed.slug, name: seed.name, contextLine: seed.contextLine, kpis: plannedKPIs(seed.kpiSeeds), solutions, activity: [], status: 'planned' as Status, openExceptions: 0 }
}

let cached: FirmState | null = null
export function getFirmState(): FirmState {
  if (cached) return cached
  const departments = departmentSeeds.map(buildDepartment)
  const firmKpis: KPI[] = [
    { label: { en: 'WORKFLOWS PLANNED', ar: 'تدفقات مخطّطة' }, value: String(departments.reduce((s, d) => s + d.solutions.length, 0)) },
    { label: { en: 'DECISIONS ISSUED · 24H', ar: 'قرارات صادرة · 24س' }, value: EMPTY },
    { label: { en: 'EXCEPTIONS · OPEN', ar: 'استثناءات مفتوحة' }, value: EMPTY },
    { label: { en: 'INTERVENTIONS REQUIRED', ar: 'تدخلات مطلوبة' }, value: EMPTY },
    { label: { en: 'INTEGRATED SYSTEMS', ar: 'أنظمة متكاملة' }, value: EMPTY },
    { label: { en: 'AVG EXECUTION LATENCY', ar: 'متوسط زمن التنفيذ' }, value: EMPTY }
  ]
  const globalActivity: ActivityEvent[] = []
  const globalInterventions: Intervention[] = []
  const trend: Chart = emptyChart({ en: 'DECISIONS vs EXCEPTIONS · 7D', ar: 'القرارات مقابل الاستثناءات · 7 أيام' }, { en: 'Decisions', ar: 'قرارات' }, { en: 'Exceptions', ar: 'استثناءات' })
  const notifications: Notification[] = []
  cached = { clientName: 'MEC', firmKpis, globalActivity, globalInterventions, trend, departments, notifications }
  return cached
}
export function getDepartment(slug: string) { return getFirmState().departments.find(d => d.slug === slug) }
export function getSolution(deptSlug: string, solSlug: string) {
  const dept = getDepartment(deptSlug); if (!dept) return undefined
  const solution = dept.solutions.find(s => s.slug === solSlug); if (!solution) return undefined
  return { dept, solution }
}
