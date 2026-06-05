import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LegitShell, ListingRow, PremiumCard, SearchIcon, type Listing } from './legit'

type Stats = { uses_count: number; positive_count: number; negative_count: number }

// Default ranking signal = completeness (quality of the structured listing)
// + lifetime reaction/usage signal. No time window — all-time totals.
function rankScore(r: Listing, s?: Stats): number {
  let c = 0
  if (r.image_url) c += 3
  if (r.category) c += 2
  if (r.tagline) c += 1
  if (r.description && r.description.length > 40) c += 2
  if ((r.features?.length || 0) >= 3) c += 2
  if (r.who_for?.length) c += 1
  if (r.pricing) c += 1
  if (r.how_to_use) c += 1
  const rx = s ? s.uses_count * 3 + s.positive_count * 2 - s.negative_count : 0
  return c + rx
}

export function DirectoryPage() {
  const [rows, setRows] = useState<Listing[] | null>(null)
  const [stats, setStats] = useState<Map<string, Stats>>(new Map())
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const cat = params.get('cat')
  const setCat = (c: string | null) => {
    const next = new URLSearchParams(params)
    if (c) next.set('cat', c); else next.delete('cat')
    setParams(next, { replace: true })
  }

  useEffect(() => {
    let alive = true
    supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => { if (alive) setRows((data as Listing[] | null) || []) })
    supabase
      .from('listing_reaction_stats')
      .select('listing_id, uses_count, positive_count, negative_count')
      .then(({ data }) => {
        if (!alive || !data) return
        const m = new Map<string, Stats>()
        for (const s of data as ({ listing_id: string } & Stats)[]) m.set(s.listing_id, s)
        setStats(m)
      })
    return () => { alive = false }
  }, [])

  const cats = useMemo(() => {
    if (!rows) return []
    const m = new Map<string, number>()
    for (const r of rows) if (r.category) m.set(r.category, (m.get(r.category) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c)
  }, [rows])

  const filtered = useMemo(() => {
    if (!rows) return []
    const needle = q.trim().toLowerCase()
    const out = rows.filter(r => {
      if (cat && r.category !== cat) return false
      if (needle) {
        const hay = `${r.name} ${r.tagline || ''} ${r.description || ''} ${r.domain} ${r.category || ''} ${(r.features || []).join(' ')}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
    // Default order = quality/completeness + lifetime reaction signal, desc.
    // Stable sort keeps created_at desc as the tiebreak (rows arrive newest-first).
    return [...out].sort((a, b) => rankScore(b, stats.get(b.id)) - rankScore(a, stats.get(a.id)))
  }, [rows, q, cat, stats])

  const featured = useMemo(() =>
    (rows || []).filter(r => r.image_url)
      .sort((a, b) => rankScore(b, stats.get(b.id)) - rankScore(a, stats.get(a.id)))
      .slice(0, 3),
    [rows, stats])

  return (
    <LegitShell>
      <div className="l-herobig">
        <div className="l-wrap">
          <h1>Every launched service, tested</h1>
          <div className="sub">What each one does, who it&apos;s for, and how it holds up.</div>
          <div className="l-bigsearch">
            <SearchIcon size={18} color="#6E6557" />
            <input
              id="l-hero-search"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search tested services…"
              autoComplete="off"
            />
          </div>
          <div className="l-statrow">
            <span><b>{rows ? rows.length : '—'}</b> services</span>
            <span><b>{cats.length}</b> categories</span>
            <span>benchmarked &amp; reviewed</span>
          </div>
        </div>
      </div>

      <div className="l-wrap">
        {!q && !cat && featured.length > 0 && (
          <>
            <div className="l-prehead">Featured</div>
            <div className="l-premium">{featured.map(p => <PremiumCard key={p.id} p={p} />)}</div>
          </>
        )}
        {cats.length > 0 && (
          <div className="l-cattiles">
            <span className={`l-cattile ${!cat ? 'on' : ''}`} onClick={() => setCat(null)}>All</span>
            {cats.slice(0, 14).map(c => (
              <span key={c} className={`l-cattile ${cat === c ? 'on' : ''}`} onClick={() => setCat(cat === c ? null : c)}>{c}</span>
            ))}
          </div>
        )}

        <div className="l-feedhead">
          <h2>{cat || (q ? 'Search results' : 'All services')}</h2>
          <span className="c">{rows ? `${filtered.length} shown` : ''}</span>
        </div>

        {rows === null && <div className="l-empty">Loading…</div>}
        {rows && filtered.length === 0 && <div className="l-empty">No services match — try a different search or category.</div>}
        {filtered.map(p => <ListingRow key={p.id} p={p} />)}

        <div className="l-foot">
          legit tests and structures publicly available information on launched services. Listings reflect
          each provider&apos;s own materials — confirm details on the official site.
        </div>
      </div>
    </LegitShell>
  )
}
