// The one canonical fuzzy matcher for the portal — names (clients/suppliers) and products.
//
// Historically the same tokens/jaccard/name-resolution logic was re-implemented in dataset.ts,
// inventory-count.ts and reconcile-credit.ts, so a change in one place silently diverged from the others
// (see PORTAL_AUDIT_AND_ROADMAP.md §2). This module is the single source of truth those callers migrate
// onto. Phase A step 1 uses it to link WhatsApp documents to their orders; later steps fold the older
// copies into it. Pure functions, no React, no server-only imports — safe on client and server.

// Normalize an Arabic/Latin name or label for comparison: strip Arabic diacritics, unify alef/yaa/
// taa-marbuta variants, drop punctuation, collapse whitespace, lowercase.
export function normalizeName(s: string | null | undefined): string {
  return (s || '')
    .replace(/[ً-ْٰ]/g, '')   // Arabic short vowels / diacritics
    .replace(/[إأآا]/g, 'ا')                  // alef variants → ا
    .replace(/ى/g, 'ي')                       // alef-maqsura → yaa
    .replace(/ة/g, 'ه')                       // taa-marbuta → haa
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')        // punctuation → space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Generic words that carry no matching signal (company suffixes, "client", articles).
const STOP = new Set(['شركة', 'شركه', 'مؤسسة', 'مؤسسه', 'عميل', 'التجارية', 'التجاريه', 'للتجارة', 'للتجاره', 'the', 'co', 'company', 'est', 'trading', 'llc'])

// Content tokens of a name/label (length > 1, minus stop-words).
export function tokens(s: string | null | undefined): string[] {
  return normalizeName(s).split(' ').filter(w => w.length > 1 && !STOP.has(w))
}

// Jaccard similarity of two token sets, 0..1.
export function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const A = new Set(a), B = new Set(b)
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

// Are two names the same entity? Exact / containment / token-overlap ≥ threshold.
export function nameSimilar(a: string | null | undefined, b: string | null | undefined, threshold = 0.5): boolean {
  const na = normalizeName(a), nb = normalizeName(b)
  if (!na || !nb) return false
  if (na === nb || na.includes(nb) || nb.includes(na)) return true
  return jaccard(tokens(a), tokens(b)) >= threshold
}

type Named = { name?: string | null }

// Do two product lists share at least one product (by name similarity)?
export function productsOverlap(a: Named[] | null | undefined, b: Named[] | null | undefined, threshold = 0.5): boolean {
  const A = (a || []).filter(p => p && p.name)
  const B = (b || []).filter(p => p && p.name)
  if (!A.length || !B.length) return false
  return A.some(pa => B.some(pb => nameSimilar(pa.name, pb.name, threshold)))
}
