export type Bi = { en: string; ar: string }
export type Status = 'running' | 'awaiting_approval' | 'exception' | 'blocked' | 'planned'
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
