import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HeroStats } from '../lib/heroStats'
import { HeroTerminal } from './HeroTerminal'
import { useAuth } from '../lib/auth'
import { fetchMemberStageBuckets, type MemberStageBuckets } from '../lib/projectQueries'

// Hero h1 · 2026-05-14 tribe-flag rewrite.
// Line 1 names the tribe (people who built with Cursor / Claude / Lovable /
// Bolt), line 2 makes the offer. The terminal typing effect + gold shimmer
// on line 2 stays — line 1 is plain cream so the shimmer lands on the verb
// that names what we do for them.
const HEADLINE_LINE_1 = 'Vibecoded'
const HEADLINE_LINE_2 = 'Time to ship'
const TOTAL_HEADLINE_CHARS = HEADLINE_LINE_1.length + HEADLINE_LINE_2.length

// 2026-05-26 perf · headline was previously typed in over ~1.9s of JS
// setTimeout chains (initial state count=0 → typed character by character).
// Combined with the stagger-2 700ms fadeUp the h1 sat invisible/empty for
// ~2.5s, which is exactly the window LCP measures — the LCP candidate
// couldn't pick the h1 until it was both opaque AND non-empty, pushing
// mobile LCP to 7.4s. We now render the final text immediately so LCP
// fires at first paint. Brand "terminal" cue is preserved via the
// blinking cursor + gold shimmer on line 2.
function useTypedHeadline() {
  return {
    line1:   HEADLINE_LINE_1,
    line2:   HEADLINE_LINE_2,
    onLine2: true,
  }
}

interface HeroProps {
  // `stats` retained on the prop surface so the live-tile section (currently
  // hidden) can be re-enabled without a wiring change. LandingPage still
  // passes it. See JSX comment block below.
  stats: HeroStats
}

export function Hero(_props: HeroProps) {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  // Stage-aware Hero (2026-05-17). Returning members land on the same
  // hero as visitors, which made the primary CTA — "Analyze your MVP"
  // — push them into a fresh /submit flow even when they already had a
  // project waiting in backstage. The journey would silently restart.
  //
  // We now read the caller's stage buckets once on mount and pick the
  // primary CTA from where they actually need to go next:
  //
  //   buckets.backstage > 0  → "Continue in Backstage (N) →" (/me)
  //                            the high-leverage state · they have
  //                            audited work that wants iteration or
  //                            audition decision · do not bury them
  //                            in a fresh-audit funnel.
  //   buckets.onStage   > 0  → "Your stage standings →" (/me)
  //                            secondary state · live projects worth
  //                            checking before starting another.
  //   buckets.encore    > 0  → "Your Encore archive →" (/me)
  //                            cold state · they already cleared the
  //                            84 line, nudge to next audition exists
  //                            on secondary CTA.
  //   else / anon            → "Analyze your MVP →" (/submit)
  //                            the original visitor default.
  //
  // The secondary CTA stays as a "browse / analyze another" depending
  // on state so even a returning user with backstage rows still sees
  // a one-click path to start a fresh audit. The user-facing copy in
  // the value-prop paragraphs above does NOT change · headline +
  // animation are the brand impression and switching them on state
  // would be jarring across logins.
  const [buckets, setBuckets] = useState<MemberStageBuckets | null>(null)
  const [bucketsLoading, setBucketsLoading] = useState(false)
  useEffect(() => {
    if (!user?.id) { setBuckets(null); setBucketsLoading(false); return }
    let alive = true
    setBucketsLoading(true)
    fetchMemberStageBuckets(user.id).then(b => {
      if (!alive) return
      setBuckets(b)
      setBucketsLoading(false)
    })
    return () => { alive = false }
  }, [user?.id])

  // 2026-05-17 · CTA "flash" fix · before this, the CTA group rendered
  // the visitor-default ("Analyze your MVP →") on first paint and then
  // swapped to the stage-aware variant once buckets resolved. Returning
  // members saw a brief flash of the wrong CTA, plus a label-width
  // jump on hydration.
  //
  // Now: render the CTA pair only when we know enough to pick the right
  // copy — auth has loaded AND, if logged-in, buckets have arrived.
  // During the gap we mount a same-height skeleton so the layout
  // doesn't shift; the skeleton fades into the real button on resolve.
  const ctaReady = !authLoading && (!user || (!bucketsLoading && buckets !== null))

  const primary = pickHeroPrimaryCta(buckets)
  const onPrimary   = () => navigate(primary.to)
  // Secondary CTA · CEO 피드백 2026-05-17 · returning members already
  // see "Analyze [verb] →" embedded in the primary CTA (Continue in
  // Backstage / Your stage standings / Analyze your MVP) so the
  // secondary shouldn't duplicate the analyze funnel. Send them to
  // /products to browse what other vibecoders are shipping —
  // exposure to peer work + a discovery surface. Anon visitors keep
  // the original "Browse products →" pointing at the same page.
  const hasAnyBucket = !!(buckets && (buckets.backstage > 0 || buckets.onStage > 0 || buckets.encore > 0))
  const onSecondary = () => navigate('/products')
  const secondaryLabel = hasAnyBucket
    ? "Browse other vibecoders' projects →"
    : 'Browse products →'

  return (
    <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 md:px-10 lg:px-24 xl:px-32 2xl:px-40 pt-20 pb-16 overflow-hidden">

      {/* ── Subtle background orbs · drift slowly behind the content.
          Pure CSS — radial-gradient blobs with heavy blur. Two-object
          composition (warm gold top-left · cool indigo bottom-right) so
          the canvas has weight without competing with the headline. */}
      <div aria-hidden="true" className="hero-orbs">
        <span className="hero-orb hero-orb-gold" />
        <span className="hero-orb hero-orb-indigo" />
      </div>

      {/* ── Two-column shell · stacked on mobile/md, side-by-side on lg+ ──
          2026-05-26 perf · min-height locks the row so font-display:swap
          (Playfair Display loads from Google Fonts → first paint uses
          serif fallback with different metrics → h1 height changes when
          Playfair arrives) cannot expand the grid and shove every
          downstream section. Without this lock, desktop CLS = 0.116
          (poor). The lock heights are sized to the natural h1+CTA
          column height at the largest clamp() value so the swap is a
          metric change inside a fixed-height box, not a flow shift. */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-10 items-center min-h-[560px] lg:min-h-[640px]">

        {/* ── LEFT · badge + headline + sub + CTAs ── */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <div
            className="stagger-1 inline-flex items-center gap-2 mb-8 px-4 py-2 font-mono text-xs tracking-widest"
            style={{
              background: 'rgba(240,192,64,0.06)',
              border: '1px solid rgba(240,192,64,0.25)',
              borderRadius: '2px',
              color: 'var(--gold-500)',
            }}
          >
            <span className="pulse-dot w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            LADDER LIVE<span className="hidden sm:inline"> · CLASS OF 2026</span>
          </div>

          <TypedH1 />

          <div className="stagger-3 w-24 h-px mb-6" style={{ background: 'var(--gold-500)', opacity: 0.4 }} />

          {/* Value prop · errors-first positioning (2026-04-30 pivot).
              Mobile breaks the two sentences onto separate lines so the
              second beat lands; desktop keeps them on one line. */}
          <p
            className="stagger-3 max-w-lg mb-3 font-display"
            style={{ color: 'var(--cream)', fontSize: '1.45rem', lineHeight: 1.4, fontWeight: 600 }}
          >
            AI ships fast.<span className="hidden sm:inline">{' '}</span><br className="sm:hidden" />AI also misses things.
          </p>
          <p
            className="stagger-3 max-w-lg mb-10 font-light"
            style={{ color: 'rgba(248,245,238,0.55)', fontSize: '0.92rem', lineHeight: 1.6 }}
          >
            We catch what your prompts forgot. First 3 audits are free.
          </p>

          <div className="stagger-4 flex gap-4 justify-center lg:justify-start flex-wrap">
            {ctaReady ? (
              <>
                <button
                  onClick={onPrimary}
                  className="px-8 py-3.5 text-sm font-medium tracking-wide transition-all"
                  style={{
                    background: 'var(--gold-500)',
                    color: 'var(--navy-900)',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontFamily: 'DM Mono, monospace',
                    boxShadow: '0 0 40px rgba(240,192,64,0.2)',
                    width: '280px',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-400)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(240,192,64,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold-500)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(240,192,64,0.2)'; }}
                >
                  {primary.label}
                </button>
                <button
                  onClick={onSecondary}
                  className="px-8 py-3.5 text-sm font-medium tracking-wide transition-all"
                  style={{
                    background: 'transparent',
                    color: 'var(--cream)',
                    border: '1px solid rgba(248,245,238,0.2)',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    fontFamily: 'DM Mono, monospace',
                    width: '280px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(240,192,64,0.5)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(248,245,238,0.2)')}
                >
                  {secondaryLabel}
                </button>
              </>
            ) : (
              <>
                {/* Skeleton buttons · same width/height as the real
                    buttons so the layout doesn't shift when ctaReady
                    flips. Gentle pulse keeps it from looking broken
                    on slow connections. The CTAs themselves only
                    render once auth + buckets resolve — guarantees
                    a returning member never sees "Analyze your MVP →"
                    flash before "Continue in Backstage (N) →". */}
                <div
                  aria-hidden="true"
                  className="cta-skeleton"
                  style={{
                    width: '280px',
                    height: '48px',
                    background: 'rgba(240,192,64,0.18)',
                    border: 'none',
                    borderRadius: '2px',
                  }}
                />
                <div
                  aria-hidden="true"
                  className="cta-skeleton"
                  style={{
                    width: '280px',
                    height: '48px',
                    background: 'transparent',
                    border: '1px solid rgba(248,245,238,0.1)',
                    borderRadius: '2px',
                  }}
                />
              </>
            )}
          </div>

          {/* Stage-buckets strip · returning user awareness. Shows the
              caller's BACKSTAGE / ON STAGE / ENCORE counts once they
              have at least one in any bucket. Anchored on /me deep-links
              by bucket so each chip is a navigation atom, not just a
              count. Anon and empty-bucket members see nothing here —
              the hero stays on the brand-impression default. */}
          {buckets && (buckets.backstage > 0 || buckets.onStage > 0 || buckets.encore > 0) && (
            <div className="stagger-4 mt-6 flex gap-2 flex-wrap justify-center lg:justify-start font-mono text-[10px] tracking-widest">
              <span style={{ color: 'rgba(248,245,238,0.35)' }}>YOUR JOURNEY · </span>
              {buckets.backstage > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/backstage')}
                  className="px-2 py-1 transition-colors"
                  style={{ background: 'rgba(248,245,238,0.06)', color: 'var(--cream)', border: '1px solid rgba(248,245,238,0.18)', borderRadius: '2px', cursor: 'pointer' }}
                >
                  {buckets.backstage} BACKSTAGE
                </button>
              )}
              {buckets.onStage > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/me/products')}
                  className="px-2 py-1 transition-colors"
                  style={{ background: 'rgba(0,212,170,0.08)', color: '#00D4AA', border: '1px solid rgba(0,212,170,0.25)', borderRadius: '2px', cursor: 'pointer' }}
                >
                  {buckets.onStage} ON STAGE
                </button>
              )}
              {buckets.encore > 0 && (
                <button
                  type="button"
                  onClick={() => navigate('/me/products')}
                  className="px-2 py-1 transition-colors"
                  style={{ background: 'rgba(240,192,64,0.10)', color: 'var(--gold-500)', border: '1px solid rgba(240,192,64,0.35)', borderRadius: '2px', cursor: 'pointer' }}
                >
                  {buckets.encore} ENCORE
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT · live terminal · header + animated audit demo ── */}
        <div className="stagger-5 flex flex-col items-center lg:items-stretch w-full">
          <div className="font-mono text-xs tracking-widest mb-3 text-center lg:text-left" style={{ color: 'var(--gold-500)' }}>
            // LIVE FROM YOUR TERMINAL
          </div>
          <p className="font-light text-sm mb-5 text-center lg:text-left" style={{ color: 'rgba(248,245,238,0.55)' }}>
            <span className="font-mono" style={{ color: 'var(--gold-500)' }}>npx commitshow@latest audit</span>
            {' '}on any GitHub repo. Catch what your AI missed in 60 seconds.
          </p>
          <HeroTerminal />
        </div>
      </div>

      {/* ── Live stats tiles · TEMPORARILY HIDDEN ──
          Hidden 2026-04-28 — kept in source so the wiring (HeroStats prop,
          fmtNum/fmtDelta helpers, Tile component) is one un-comment away.
          Re-enable by deleting the `false && ` guard below. */}
      {false && (
        <div className="stagger-5 flex gap-6 md:gap-14 justify-center flex-wrap mt-16">
          {/* Tiles render here when re-enabled. See git history at this commit
              for the original 4-tile layout (PRODUCTS LIVE / SCOUTS ACTIVE /
              VOTES CAST / GRADUATES IN). */}
        </div>
      )}
    </section>
  )
}

// ── Primary CTA picker · drives the gold button label + target.
// Anon and zero-bucket members → fresh-audit funnel (current default).
// Members with any active stage → land on /me where they can continue.
// Priority order (backstage > onStage > encore) matches "where is the
// most actionable next step": backstage rows want decisions
// (audition? polish? re-audit?), on-stage rows are passively progressing,
// encore rows are completed work · least urgent.
function pickHeroPrimaryCta(buckets: MemberStageBuckets | null): { label: string; to: string } {
  if (!buckets) {
    return { label: 'Analyze your MVP →', to: '/submit' }
  }
  if (buckets.backstage > 0) {
    const n = buckets.backstage
    return {
      label: `Continue in Backstage (${n}) →`,
      to:    '/backstage',
    }
  }
  // 2026-05-17 · onStage / encore land on /me/products (the portfolio
  // grid) rather than /me (the profile header + standings + library).
  // /me is "everything about me · account context"; /me/products is
  // "the products themselves" — for a creator whose next action is
  // "look at my projects", the grid is the right surface. /me would
  // bury the products under an account header.
  if (buckets.onStage > 0) {
    return { label: 'Your stage standings →', to: '/me/products' }
  }
  if (buckets.encore > 0) {
    return { label: 'Your Encore archive →', to: '/me/products' }
  }
  return { label: 'Analyze your MVP →', to: '/submit' }
}

// ── Typed-terminal headline ───────────────────────────────────
// Renders "Show your\nCommit" as if typed at a 95ms-per-char cadence,
// with a longer pause at the line break for the carriage return.
// Reduced-motion users get the full text instantly. The cursor sits at
// the live caret, then settles after "Commit" finishes typing.
function TypedH1() {
  const { line1, line2, onLine2 } = useTypedHeadline()

  return (
    <h1
      // 2026-05-26 perf · stagger-2 (fadeUp opacity:0 → 1 + translateY)
      // was dropped from the LCP element. The 700ms 0.2s-delayed fade-in
      // meant the h1 sat at opacity:0 for the first ~900ms — invisible to
      // the LCP detector, which then waited for a later paint and pushed
      // mobile LCP to 7.4s. The rest of the hero column keeps its
      // staggered intro; only the LCP candidate paints immediately.
      className="font-display font-black leading-none mb-6"
      // Tightening dropped 2026-05-14 · 'Time to ship' (was 'Time to audit') is ~12 chars vs the old
      // 'Commit' (6 chars), and the -1.5px / tracking-tight pair was making the
      // serif glyphs collide. CLAUDE.md §4 prefers no letter-spacing override
      // outside the 3.5–8rem 'Hero 초대형' range — our clamp lands at 3rem on
      // mobile so the default kerning is the cleaner default.
      //
      // 2026-05-14b · clamp max shrunk 6.5rem → 4.75rem because at the old
      // size the 13-char line 2 overflowed the lg 50% left column and
      // collided with HeroTerminal. New max keeps the wordmark large but
      // inside its half of the grid.
      style={{ fontSize: 'clamp(2.75rem, 5.5vw, 4.75rem)' }}
    >
      <span style={{ color: 'var(--cream)' }}>{line1 || '​'}</span>
      {!onLine2 && <span className="terminal-cursor" aria-hidden="true" />}
      <br />
      {/* Use ​ (zero-width space) to keep line height even before any
          characters of "Commit" have been typed — prevents a layout shift
          when the second line starts populating. */}
      <em className="gold-shimmer not-italic">{line2 || '​'}</em>
      {onLine2 && <span className="terminal-cursor" aria-hidden="true" />}
    </h1>
  )
}
