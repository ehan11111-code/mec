// SERVER-ONLY — imported only by /api/auth route handlers. Never import from a client component
// (it reads SUPABASE_SERVICE_ROLE_KEY + AUTH_SECRET and contains the fallback password map).
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto'
import { ROSTER, findUser, permissionsFor, type Me, type Role } from './users'

// ── password hashing (scrypt, no native deps) ──────────────────────────────
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex')
  const h = scryptSync(pw, salt, 64).toString('hex')
  return `scrypt$${salt}$${h}`
}
export function verifyHash(pw: string, stored: string): boolean {
  const [scheme, salt, h] = (stored || '').split('$')
  if (scheme !== 'scrypt' || !salt || !h) return false
  try {
    const calc = scryptSync(pw, salt, 64)
    const want = Buffer.from(h, 'hex')
    return want.length === calc.length && timingSafeEqual(want, calc)
  } catch { return false }
}

// ── signed session cookie (HMAC-SHA256, httpOnly on the response) ───────────
export const SESSION_COOKIE = 'mec_session'
const SECRET = process.env.AUTH_SECRET || 'dev-insecure-change-me'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days
type SessionPayload = { u: string; r: Role; exp: number }

function b64url(b: Buffer) { return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function safeEq(a: string, b: string) {
  const ab = Buffer.from(a), bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}
export function signSession(u: string, r: Role): string {
  const body = b64url(Buffer.from(JSON.stringify({ u, r, exp: Date.now() + MAX_AGE * 1000 } as SessionPayload)))
  const sig = b64url(createHmac('sha256', SECRET).update(body).digest())
  return `${body}.${sig}`
}
export function verifySession(token?: string | null): SessionPayload | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expect = b64url(createHmac('sha256', SECRET).update(body).digest())
  if (!safeEq(sig, expect)) return null
  try {
    const p = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) as SessionPayload
    if (!p.u || (p.exp && Date.now() > p.exp)) return null
    return p
  } catch { return null }
}
export const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: MAX_AGE }

// ── Supabase (service-role) access to app_users ────────────────────────────
function cfg() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  return url && key ? { url: url.replace(/\/+$/, ''), key } : null
}
type DbUser = { username: string; role: Role; password_hash: string; avatar_url?: string | null }

async function dbGet(username: string): Promise<DbUser | null> {
  const c = cfg(); if (!c) return null
  try {
    const r = await fetch(`${c.url}/rest/v1/app_users?username=eq.${encodeURIComponent(username)}&select=username,role,password_hash,avatar_url`, {
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}` }, cache: 'no-store'
    })
    if (!r.ok) return null
    const j = await r.json()
    return Array.isArray(j) && j[0] ? j[0] : null
  } catch { return null }
}
async function dbPatch(username: string, body: Record<string, unknown>): Promise<boolean> {
  const c = cfg(); if (!c) return false
  try {
    const r = await fetch(`${c.url}/rest/v1/app_users?username=eq.${encodeURIComponent(username)}`, {
      method: 'PATCH',
      headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ ...body, updated_at: new Date().toISOString() }), cache: 'no-store'
    })
    return r.ok
  } catch { return false }
}
async function dbAvatar(username: string): Promise<string | null> {
  const u = await dbGet(username); return u?.avatar_url ?? null
}

// First-run / offline fallback: the seeded default passwords live ONLY on the server. Used to verify
// when Supabase has no row yet (before the seed script runs). Change these or re-seed to rotate.
const DEFAULT_PASSWORDS: Record<string, string> = {
  'jarvis': 'Jarvis@MEC2026', 'f.muzaiyen': 'Falcon-7392', 't.saudi': 'Cedar-4815',
  'a.alhatlani': 'Harbor-2659', 't.habash': 'Ledger-3074', 'm.salamh': 'Summit-6128', 't.najar': 'Vertex-5043'
}

// ── public server API ──────────────────────────────────────────────────────
export async function verifyCredentials(username: string, password: string): Promise<Me | null> {
  const roster = findUser(username); if (!roster) return null
  const db = await dbGet(roster.username)
  let ok = false
  if (db?.password_hash) ok = verifyHash(password, db.password_hash)
  else ok = DEFAULT_PASSWORDS[roster.username] === password   // pre-seed fallback (server-only)
  if (!ok) return null
  return toMe(roster.username, db?.avatar_url ?? null)
}

export async function meFor(username: string): Promise<Me | null> {
  const roster = findUser(username); if (!roster) return null
  return toMe(username, await dbAvatar(username))
}

function toMe(username: string, avatar: string | null): Me | null {
  const r = findUser(username); if (!r) return null
  return { username: r.username, name: r.name, role: r.role, title: r.title, email: r.email, color: r.color, permissions: permissionsFor(r.role), avatar }
}

export async function changePassword(username: string, current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  if (!findUser(username)) return { ok: false, error: 'unknown_user' }
  if (next.length < 6) return { ok: false, error: 'too_short' }
  const verified = await verifyCredentials(username, current)
  if (!verified) return { ok: false, error: 'wrong_current' }
  const saved = await dbPatch(username, { password_hash: hashPassword(next) })
  return saved ? { ok: true } : { ok: false, error: 'store_unavailable' }
}

const WORDS = ['Falcon', 'Cedar', 'Harbor', 'Summit', 'Vertex', 'Orbit', 'Delta', 'Atlas', 'Nova', 'Pearl', 'Saffron', 'Cobalt']
export async function resetPassword(username: string): Promise<{ ok: boolean; password?: string; error?: string }> {
  if (!findUser(username)) return { ok: false, error: 'unknown_user' }
  const pw = `${WORDS[randomBytes(1)[0] % WORDS.length]}-${1000 + (randomBytes(2).readUInt16BE(0) % 9000)}`
  const saved = await dbPatch(username, { password_hash: hashPassword(pw) })
  return saved ? { ok: true, password: pw } : { ok: false, error: 'store_unavailable' }
}

export async function setAvatar(username: string, dataUrl: string): Promise<boolean> {
  if (!findUser(username) || !dataUrl.startsWith('data:image/')) return false
  return dbPatch(username, { avatar_url: dataUrl.slice(0, 1_500_000) })
}

// Seed/upsert the whole roster with hashed default passwords (used by scripts/seed-users.js logic).
export function defaultSeedRows() {
  return ROSTER.map(r => ({
    username: r.username, name_en: r.name.en, name_ar: r.name.ar, role: r.role,
    title_en: r.title.en, title_ar: r.title.ar, email: r.email, color: r.color,
    password_hash: hashPassword(DEFAULT_PASSWORDS[r.username] || 'ChangeMe-0000')
  }))
}
