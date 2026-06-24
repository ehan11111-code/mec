// MEC employee accounts, roles and per-role permissions. This is a demo portal (no real backend
// secrets in the frontend per CLAUDE.md §2) — credentials live here and are checked client-side.
// Passwords can be changed/reset per user; overrides are stored in localStorage (see ../auth.ts).

export type Permission =
  | 'dashboard' | 'analytics' | 'clients' | 'orders' | 'approvals'
  | 'warehouse' | 'logistics' | 'finance' | 'supply' | 'whatsapp'
  | 'documents' | 'departments' | 'savings' | 'academy' | 'contact'
  | 'messages' | 'notifications' | 'automations' | 'admin'

export type Role = 'admin' | 'ceo' | 'commercial' | 'warehouse' | 'finance' | 'sales'

export type Bi = { en: string; ar: string }

export type User = {
  username: string
  password: string                 // default password (may be overridden by the user)
  name: Bi
  role: Role
  title: Bi
  email: string
  color: string                    // avatar fallback tint
}

// Everything a workspace member always gets.
const BASE: Permission[] = ['messages', 'notifications', 'academy', 'contact', 'departments']

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // JARVIS super-admin — the Jarvis AI team account. Everything, including automations + user admin.
  admin: ['dashboard', 'analytics', 'clients', 'orders', 'approvals', 'warehouse', 'logistics', 'finance', 'supply', 'whatsapp', 'documents', 'departments', 'savings', 'academy', 'contact', 'messages', 'notifications', 'automations', 'admin'],
  // CEO — full business visibility across every department (but not the automations engine / user admin).
  ceo: [...BASE, 'dashboard', 'analytics', 'clients', 'orders', 'approvals', 'warehouse', 'logistics', 'finance', 'supply', 'whatsapp', 'savings'],
  // Commercial Manager — sales + purchasing oversight: clients, orders, approvals, market intel, WhatsApp.
  commercial: [...BASE, 'dashboard', 'analytics', 'clients', 'orders', 'approvals', 'supply', 'whatsapp', 'savings'],
  // Warehouse & logistics — fulfilment: orders, warehouse, logistics, and supply lead-times.
  warehouse: [...BASE, 'dashboard', 'orders', 'warehouse', 'logistics', 'supply'],
  // Financial — money: collections/finance, client credit, approvals (payment risk), analytics.
  finance: [...BASE, 'dashboard', 'analytics', 'clients', 'orders', 'approvals', 'finance', 'savings'],
  // Sales team — front line: their clients, orders, order approvals, WhatsApp leads.
  sales: [...BASE, 'dashboard', 'clients', 'orders', 'approvals', 'whatsapp']
}

// The MEC roster. Usernames are firstInitial.lastname; JARVIS is the admin account for the Jarvis team.
export const USERS: User[] = [
  { username: 'jarvis', password: 'Jarvis@MEC2026', role: 'admin', email: 'partners@jarvisksa.com', color: '#F36C34',
    name: { en: 'JARVIS Admin', ar: 'مشرف جارفيس' }, title: { en: 'Jarvis AI · System Administrator', ar: 'جارفيس · مدير النظام' } },
  { username: 'f.muzaiyen', password: 'Falcon-7392', role: 'ceo', email: 'fauwaz@mec.com.sa', color: '#C7882B',
    name: { en: 'Fauwaz Al-Muzaiyen', ar: 'فواز المزين' }, title: { en: 'Chief Executive Officer', ar: 'الرئيس التنفيذي' } },
  { username: 't.saudi', password: 'Cedar-4815', role: 'commercial', email: 'tarek.saudi@mec.com.sa', color: '#3B82A0',
    name: { en: 'Tarek Saudi', ar: 'طارق سعودي' }, title: { en: 'Commercial Manager', ar: 'المدير التجاري' } },
  { username: 'a.alhatlani', password: 'Harbor-2659', role: 'warehouse', email: 'abdullah.alhatlani@mec.com.sa', color: '#5A8F5A',
    name: { en: 'Abdullah Alhatlani', ar: 'عبدالله الحطلاني' }, title: { en: 'Warehouse & Logistics', ar: 'المستودع واللوجستيات' } },
  { username: 't.habash', password: 'Ledger-3074', role: 'finance', email: 'tarek.habash@mec.com.sa', color: '#8A6FB0',
    name: { en: 'Tarek Habash', ar: 'طارق حبش' }, title: { en: 'Financial Manager', ar: 'المدير المالي' } },
  { username: 'm.salamh', password: 'Summit-6128', role: 'sales', email: 'mahmoud.salamh@mec.com.sa', color: '#B0563F',
    name: { en: 'Mahmoud Salamh', ar: 'محمود سلامة' }, title: { en: 'Sales Team', ar: 'فريق المبيعات' } },
  { username: 't.najar', password: 'Vertex-5043', role: 'sales', email: 'tamer.najar@mec.com.sa', color: '#4F7CAC',
    name: { en: 'Tamer Najar', ar: 'تامر نجار' }, title: { en: 'Sales Team', ar: 'فريق المبيعات' } }
]

export function findUser(username: string): User | undefined {
  const u = username.trim().toLowerCase()
  return USERS.find(x => x.username.toLowerCase() === u)
}
export function permissionsFor(role: Role): Permission[] { return ROLE_PERMISSIONS[role] ?? [] }
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U'
}
