// CheckPage · /check ad-traffic landing page (2026-05-28).
//
// Built for paid acquisition ("바이브 코더라면 세상에 내놓기 전에 검증해봐").
// Single-fold, chrome-less, one CTA: paste URL → 60s audit → result.
// Nav + sidebar are short-circuited on this path (Nav.tsx + App.tsx)
// so the audit input owns the user's first 2 seconds with no competing
// surfaces.
//
// Architecture choice: reuse <HeroUrlHook chromeless /> for the entire
// audit state machine + result card. The marketing hero (headline +
// sub-copy + CTA framing) lives here; the actual form/probe/result UI
// is one component shared with the landing page so there's one
// audit-site-preview integration to maintain.
//
// Repo audit is offered as a secondary path (Link to /submit) rather than
// a second equal-weight input on the LP — decision fatigue would tank
// conversion. Ad audience is overwhelmingly "MVP deployed, repo public
// status unknown"; URL paste is the universal entry.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeroUrlHook } from '../components/HeroUrlHook'

// Stable id assigned to the audit input so the mode toggle above can
// focus it after a switch (keyboard users + iOS keyboard popup feel).
const URL_INPUT_ID = 'check-audit-input'

type AuditMode = 'site' | 'repo'

// Mode-specific placeholder + helper. audit-site-preview already
// auto-detects + forwards github URLs to the anonymous walk-on path,
// so the toggle is a UX affordance for the user's mental model — the
// backend doesn't care which mode they picked. We still tailor the
// helper line so the user knows what each lane actually measures.
// Lead with the offer in cream (95%) so "Free · ~60 seconds" is the
// first thing the eye lands on after the form, then the lane-specific
// measure list trails in text-secondary (55%).
const FREE_LEAD = <span style={{ color: 'var(--cream)' }}>Free · ~60 seconds</span>

const MODE_COPY: Record<AuditMode, { placeholder: string; helper: React.ReactNode }> = {
  site: {
    placeholder: 'https://your-app.com',
    helper: <>{FREE_LEAD} · checks Lighthouse, security headers, broken routes, and live URL health.</>,
  },
  repo: {
    placeholder: 'github.com/owner/repo',
    helper: <>{FREE_LEAD} · reads README, tests, CI, license, observability signals, code health.</>,
  },
}

// Phase mirrored from HeroUrlHook so the sample mockup below the form
// hides during running/ready/error (where the real progress trail or
// result card takes over the visual weight) and shows in idle.
type HookPhase = 'idle' | 'running' | 'ready' | 'error'

export function CheckPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuditMode>('site')
  const [hookPhase, setHookPhase] = useState<HookPhase>('idle')

  // Switching mode keeps any pasted value as-is — backend auto-detects
  // regardless. Refocus the input so the user can immediately type a
  // new URL if they just switched lanes. setTimeout past the React
  // re-render so the input gets the new placeholder first.
  const switchMode = (next: AuditMode) => {
    if (next === mode) return
    setMode(next)
    setTimeout(() => {
      const input = document.getElementById(URL_INPUT_ID) as HTMLInputElement | null
      input?.focus()
    }, 0)
  }
  return (
    <main
      className="relative min-h-screen flex flex-col"
      style={{ background: 'var(--navy-950)', color: 'var(--cream)' }}
    >
      {/* ── Minimal logo strip · the only chrome on the page.
          No Nav, no sidebar, no menu — the page exists to convert
          ad traffic into a single audit run. Logo links home so a
          curious visitor can still escape to the full site. */}
      <header className="px-6 md:px-10 lg:px-16 pt-6">
        <Link to="/" className="inline-flex items-center" style={{ textDecoration: 'none' }}>
          <span className="font-display font-bold text-xl tracking-tight" style={{ color: 'var(--cream)' }}>
            Commit<span style={{ color: 'var(--gold-500)' }}>.Show</span>
          </span>
        </Link>
      </header>

      {/* ── Marketing hero · ad-aligned copy.
          Headline mirrors the ad creative so post-click feels like the
          same conversation. Sub copy is two short beats matching the
          errors-first thesis on the main site (Hero.tsx:155-161) without
          duplicating it verbatim. */}
      <section className="relative z-10 px-6 md:px-10 lg:px-16 pt-14 md:pt-20 pb-4">
        <div className="max-w-3xl mx-auto">
          <div className="font-mono text-xs tracking-widest mb-4" style={{ color: 'var(--gold-500)' }}>
            // FREE · 60 SEC · NO SIGNUP
          </div>
          <h1
            className="font-display font-black leading-none mb-6"
            style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4rem)', color: 'var(--cream)' }}
          >
            Before you ship it,<br />
            <span className="gold-shimmer">see what AI missed</span>
          </h1>
          <p
            className="font-display mb-3"
            style={{ color: 'var(--cream)', fontSize: '1.35rem', lineHeight: 1.4, fontWeight: 600 }}
          >
            AI ships fast. AI also misses things.
          </p>
          <p
            className="font-light max-w-xl mb-2"
            style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}
          >
            We catch what your prompts forgot — Lighthouse, security headers, broken routes,
            production-readiness signals across 14 frames. Paste your URL.
          </p>
        </div>
      </section>

      {/* ── Audit entry · chromeless HeroUrlHook = form + state machine +
          result card from the landing page, with its own section bg/
          eyebrow/h2/sub copy suppressed. Sole audit surface on the LP.
          The Site URL ↔ GitHub repo segmented toggle rides in the
          `prependBeforeForm` slot so it sits directly above the input
          AND disappears together with the form once analysis starts —
          previously the toggle dangled above the running progress list
          with no input attached. Backend (audit-site-preview) auto-
          detects + forwards github URLs to the anonymous walk-on path
          regardless of which segment is active; the toggle is a
          mental-model affordance and the placeholder/helper driver. */}
      <div className="mb-12">
        <HeroUrlHook
          chromeless
          inputId={URL_INPUT_ID}
          placeholder={MODE_COPY[mode].placeholder}
          helperText={MODE_COPY[mode].helper}
          // After signup from the ad-LP, drop the new member straight
          // onto the backstage view of the project they just audited.
          // /submit (the default destination) is wrong here — that's
          // the "I came to register a project" funnel, but ad-LP users
          // came in via "see what AI missed" and want to keep looking
          // at THEIR score, with the coach panel one tab away.
          onPostSignIn={(projectId) => {
            if (projectId) navigate(`/projects/${projectId}`)
            else           navigate('/me')
          }}
          onPhaseChange={setHookPhase}
          prependBeforeForm={
            <div
              role="tablist"
              aria-label="Audit input mode"
              className="inline-flex font-mono text-xs tracking-widest"
              style={{
                border: '1px solid rgba(240,192,64,0.25)',
                borderRadius: '2px',
                background: 'rgba(6,12,26,0.4)',
              }}
            >
              {(['site', 'repo'] as const).map((m) => {
                const active = mode === m
                const label = m === 'site' ? 'SITE URL' : 'GITHUB REPO'
                return (
                  <button
                    key={m}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    onClick={() => switchMode(m)}
                    className="px-4 py-2 transition-all"
                    style={{
                      background: active ? 'var(--gold-500)' : 'transparent',
                      color: active ? 'var(--navy-900)' : 'var(--text-secondary)',
                      border: 'none',
                      cursor: active ? 'default' : 'pointer',
                      fontWeight: active ? 600 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.color = 'var(--cream)'
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.color = 'var(--text-secondary)'
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          }
        />
      </div>

      {/* ── Sample report mockup · 2026-05-28 · fills the dead zone below
          the form during idle so ad-LP visitors can see THE SHAPE of
          what's behind the 60-second wait. Static visual — not a live
          example fetched from the DB, so we mark "// EXAMPLE" up top
          to keep it honest. Hidden once analysis starts so the real
          progress trail + result card take the visual lead. */}
      {hookPhase === 'idle' && <SampleReportCard />}

      {/* ── Minimal trust strip · footer-equivalent.
          One line · brand attribution · legal links. Anything more
          would invite users away from the audit CTA. */}
      <footer
        className="relative z-10 mt-auto px-6 md:px-10 lg:px-16 py-8 font-mono text-xs"
        style={{ color: 'var(--text-faint)', borderTop: '1px solid rgba(240,192,64,0.06)' }}
      >
        <div className="max-w-3xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>commit.show · audit engine for vibe-coded MVPs</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <Link to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
          <Link to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
          <Link to="/rulebook" style={{ color: 'inherit', textDecoration: 'none' }}>How scoring works</Link>
        </div>
      </footer>
    </main>
  )
}

/**
 * SampleReportCard — static preview of what a real audit looks like.
 *
 * Drops into the dead zone below the audit form during idle phase so an
 * ad-LP visitor doesn't see a giant empty rectangle while deciding
 * whether to paste their URL. The numbers and bullets are illustrative
 * (not pulled from a live row) so we mark "// EXAMPLE" up top and
 * caption the bottom — keeps the promise honest. Visual borrows the
 * tone of the real ResultCard (HeroUrlHook.tsx ResultCard) so the
 * shape feels familiar once the actual one lands, just dimmed a notch
 * (border at lower opacity, no shadow) so it reads as preview, not
 * verdict.
 */
function SampleReportCard() {
  return (
    <section className="relative z-10 px-6 md:px-10 lg:px-16 mt-2 mb-12">
      <div className="max-w-3xl">
        <div className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
          // EXAMPLE · WHAT 60 SECONDS GETS YOU
        </div>
        <div
          className="px-5 py-5"
          style={{
            background: 'rgba(6,12,26,0.4)',
            border: '1px dashed rgba(240,192,64,0.18)',
            borderRadius: '2px',
          }}
        >
          {/* Header row · host + score */}
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 mb-4">
            <div>
              <div className="font-mono text-[10px] tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>
                URL AUDIT · partial · sample
              </div>
              <div className="font-display font-black text-xl sm:text-2xl" style={{ color: 'var(--cream)' }}>
                acme-saas.io
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="font-mono text-[10px] tracking-widest" style={{ color: 'var(--text-muted)' }}>POLISH</div>
              <div className="font-display font-black" style={{ color: 'var(--gold-500)', fontSize: '2rem', lineHeight: 1 }}>
                76<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}> / 100</span>
              </div>
              <div className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>Strong</div>
            </div>
          </div>

          {/* Strengths / Concerns columns · mirrors real ResultCard layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <div>
              <div className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--gold-500)' }}>+ STRENGTHS</div>
              <ul className="space-y-1.5">
                {[
                  'Lighthouse mobile 92 · LCP 1.4s on Moto G4',
                  'All 18 routes reachable · sitemap + canonical present',
                  'Mobile a11y 96 · semantic landmarks throughout',
                ].map((s, i) => (
                  <li key={i} className="text-sm" style={{ color: 'var(--cream)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--gold-500)' }}>↑ </span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--scarlet)' }}>− TO IMPROVE</div>
              <ul className="space-y-1.5">
                {[
                  'Missing CSP and X-Frame-Options headers',
                  'No og:image · social cards fall back to placeholder',
                ].map((c, i) => (
                  <li key={i} className="text-sm" style={{ color: 'var(--cream)', lineHeight: 1.5 }}>
                    <span style={{ color: 'var(--scarlet)' }}>↓ </span>{c}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Footer caption · keeps the "this is illustrative" line below
              the report itself, where it doesn't fight the example data. */}
          <div className="mt-4 pt-3 font-mono text-[10px] tracking-widest"
               style={{ borderTop: '1px dashed rgba(248,245,238,0.08)', color: 'var(--text-muted)' }}>
            ILLUSTRATIVE · YOUR AUDIT LANDS WITH YOUR REAL NUMBERS IN ~60 SECONDS
          </div>
        </div>
      </div>
    </section>
  )
}
