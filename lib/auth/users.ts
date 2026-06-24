// CLIENT-SAFE roster + permission model. NO passwords here — credentials live only in Supabase
// (hashed) and are verified server-side in /api/auth. This file may be imported by client components
// (names/roles/colours are not secret); it is the single source of truth for the permission map.

export type Permission =
  | 'dashboard' | 'analytics' | 'clients' | 'orders' | 'approvals'
  | 'warehouse' | 'logistics' | 'finance' | 'supply' | 'whatsapp'
  | 'documents' | 'departments' | 'savings' | 'academy' | 'contact'
  | 'messages' | 'notifications' | 'automations' | 'admin' | 'manageData'

export type Role = 'admin' | 'ceo' | 'commercial' | 'warehouse' | 'finance' | 'sales'

export type Bi = { en: string; ar: string }

export type RosterUser = {
  username: string
  name: Bi
  role: Role
  title: Bi
  email: string
  color: string
}

const BASE: Permission[] = ['messages', 'notifications', 'academy', 'contact', 'departments']

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['dashboard', 'analytics', 'clients', 'orders', 'approvals', 'warehouse', 'logistics', 'finance', 'supply', 'whatsapp', 'documents', 'departments', 'savings', 'academy', 'contact', 'messages', 'notifications', 'automations', 'admin', 'manageData'],
  ceo: [...BASE, 'dashboard', 'analytics', 'clients', 'orders', 'approvals', 'warehouse', 'logistics', 'finance', 'supply', 'whatsapp', 'savings', 'manageData'],
  commercial: [...BASE, 'dashboard', 'analytics', 'clients', 'orders', 'approvals', 'supply', 'whatsapp', 'savings'],
  warehouse: [...BASE, 'dashboard', 'orders', 'warehouse', 'logistics', 'supply'],
  finance: [...BASE, 'dashboard', 'analytics', 'clients', 'orders', 'approvals', 'finance', 'savings'],
  sales: [...BASE, 'dashboard', 'clients', 'orders', 'approvals', 'whatsapp']
}

// The MEC roster (no secrets). Passwords for these accounts are seeded into Supabase, hashed.
export const ROSTER: RosterUser[] = [
  { username: 'jarvis', role: 'admin', email: 'partners@jarvisksa.com', color: '#F36C34',
    name: { en: 'JARVIS Admin', ar: 'مشرف جارفيس' }, title: { en: 'Jarvis AI · System Administrator', ar: 'جارفيس · مدير النظام' } },
  { username: 'f.muzaiyen', role: 'ceo', email: 'fauwaz@mec.com.sa', color: '#C7882B',
    name: { en: 'Fauwaz Al-Muzaiyen', ar: 'فواز المزين' }, title: { en: 'Chief Executive Officer', ar: 'الرئيس التنفيذي' } },
  { username: 't.saudi', role: 'commercial', email: 'tarek.saudi@mec.com.sa', color: '#3B82A0',
    name: { en: 'Tarek Saudi', ar: 'طارق سعودي' }, title: { en: 'Commercial Manager', ar: 'المدير التجاري' } },
  { username: 'a.alhatlani', role: 'warehouse', email: 'abdullah.alhatlani@mec.com.sa', color: '#5A8F5A',
    name: { en: 'Abdullah Alhatlani', ar: 'عبدالله الحطلاني' }, title: { en: 'Warehouse & Logistics', ar: 'المستودع واللوجستيات' } },
  { username: 't.habash', role: 'finance', email: 'tarek.habash@mec.com.sa', color: '#8A6FB0',
    name: { en: 'Tarek Habash', ar: 'طارق حبش' }, title: { en: 'Financial Manager', ar: 'المدير المالي' } },
  { username: 'm.salamh', role: 'sales', email: 'mahmoud.salamh@mec.com.sa', color: '#B0563F',
    name: { en: 'Mahmoud Salamh', ar: 'محمود سلامة' }, title: { en: 'Sales Team', ar: 'فريق المبيعات' } },
  { username: 't.najar', role: 'sales', email: 'tamer.najar@mec.com.sa', color: '#4F7CAC',
    name: { en: 'Tamer Najar', ar: 'تامر نجار' }, title: { en: 'Sales Team', ar: 'فريق المبيعات' } }
]

// Backwards-compatible alias (the messaging UI imports USERS for the colleague list).
export const USERS = ROSTER

export function findUser(username: string): RosterUser | undefined {
  const u = username.trim().toLowerCase()
  return ROSTER.find(x => x.username.toLowerCase() === u)
}
export function permissionsFor(role: Role): Permission[] { return ROLE_PERMISSIONS[role] ?? [] }
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U'
}

// Public shape returned by /api/auth/me (no secrets).
export type Me = {
  username: string; name: Bi; role: Role; title: Bi; email: string; color: string
  permissions: Permission[]; avatar?: string | null
}
