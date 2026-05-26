// RuntimeSignalsPanel · what we can see from the live URL alone.
//
// 2026-05-23 · CEO 피드백 (deliber.ai cross-check) · when the source
// scan fails (URL fast lane · github fetch failed · private repo)
// VibeConcernsPanel is hidden (its frames are all source-pattern based
// and would emit misleading PASS/FAIL on empty evidence). But the
// audit still pulled real runtime signals from the live URL — security
// response headers + CORS policy. This panel surfaces those so a
// URL-only audit isn't silent on metadata-level concerns.
//
// Data source: snapshot.rich_analysis.security_headers (analyze-project
// inspectSecurityHeaders probe). Reads the same column the score-side
// completeness slot consumes; no separate fetch.
//
// 7 cards: CSP · HSTS · X-Frame · X-Content-Type · Referrer ·
// Permissions · CORS (ACAO).

import type { ReactNode } from 'react'

export interface RuntimeSecurityHeaders {
  fetched:                boolean
  has_csp:                boolean
  has_hsts:               boolean
  has_frame_protection:   boolean
  has_content_type_opt:   boolean
  has_referrer_policy:    boolean
  has_permissions_policy: boolean
  filled:                 number
  of:                     number
  // Optional · added 2026-05-23. Older snapshots taken before the
  // ACAO capture rollout won't have these fields · we render an
  // explicit "not captured" state for those.
  acao_value?:    string | null
  acao_wildcard?: boolean
}

type Status = 'pass' | 'warn' | 'fail' | 'na'

interface CardData {
  key:     string
  title:   string
  status:  Status
  finding: string
  why:     string
}

function evaluate(sh: RuntimeSecurityHeaders): CardData[] {
  const cards: CardData[] = []
  const probe = sh.fetched
  const naFinding = 'Live URL probe failed · check skipped.'

  cards.push({
    key:   'csp',
    title: 'Content-Security-Policy',
    status: !probe ? 'na' : sh.has_csp ? 'pass' : 'warn',
    finding: !probe ? naFinding
      : sh.has_csp ? 'CSP header sent.'
      : 'No Content-Security-Policy header.',
    why: 'CSP limits which origins can load scripts / inject content · primary XSS mitigation.',
  })
  cards.push({
    key:   'hsts',
    title: 'Strict-Transport-Security',
    status: !probe ? 'na' : sh.has_hsts ? 'pass' : 'warn',
    finding: !probe ? naFinding
      : sh.has_hsts ? 'HSTS header sent.'
      : 'No Strict-Transport-Security header.',
    why: 'Forces HTTPS for return visits · blocks SSL-strip downgrade.',
  })
  cards.push({
    key:   'frame',
    title: 'X-Frame-Options / frame-ancestors',
    status: !probe ? 'na' : sh.has_frame_protection ? 'pass' : 'warn',
    finding: !probe ? naFinding
      : sh.has_frame_protection ? 'Frame embedding restricted.'
      : 'No X-Frame-Options or frame-ancestors CSP directive.',
    why: 'Stops other sites from iframing yours · clickjacking defense.',
  })
  cards.push({
    key:   'ctopt',
    title: 'X-Content-Type-Options',
    status: !probe ? 'na' : sh.has_content_type_opt ? 'pass' : 'warn',
    finding: !probe ? naFinding
      : sh.has_content_type_opt ? 'nosniff sent.'
      : 'No X-Content-Type-Options: nosniff.',
    why: 'Blocks the browser from re-guessing MIME types · stops upload-then-execute attacks.',
  })
  cards.push({
    key:   'referrer',
    title: 'Referrer-Policy',
    status: !probe ? 'na' : sh.has_referrer_policy ? 'pass' : 'warn',
    finding: !probe ? naFinding
      : sh.has_referrer_policy ? 'Referrer-Policy sent.'
      : 'No Referrer-Policy header.',
    why: 'Controls what URL data leaks to external links · privacy + leak prevention.',
  })
  cards.push({
    key:   'perm',
    title: 'Permissions-Policy',
    status: !probe ? 'na' : sh.has_permissions_policy ? 'pass' : 'warn',
    finding: !probe ? naFinding
      : sh.has_permissions_policy ? 'Permissions-Policy sent.'
      : 'No Permissions-Policy header.',
    why: 'Disables browser features your app doesn\'t use (camera · mic · geolocation).',
  })

  // CORS · only emit when the field is present on the snapshot.
  // Snapshots taken before 2026-05-23 don\'t have acao_value · we
  // surface an explicit "captured starting this date" hint instead
  // of leaving the user wondering why CORS is missing.
  const hasAcaoField = 'acao_value' in sh || 'acao_wildcard' in sh
  if (hasAcaoField) {
    const wildcard = sh.acao_wildcard === true
    const present  = (sh.acao_value ?? '').length > 0
    let status: Status
    let finding: string
    if (!probe) {
      status = 'na'; finding = naFinding
    } else if (wildcard) {
      status = 'fail'; finding = 'access-control-allow-origin: * · any website can call this API from a user\'s browser.'
    } else if (present) {
      status = 'pass'; finding = `Scoped CORS · access-control-allow-origin: ${sh.acao_value}`
    } else {
      status = 'na'; finding = 'No access-control-allow-origin header · same-origin only (browser default).'
    }
    cards.push({
      key:   'cors',
      title: 'CORS · Access-Control-Allow-Origin',
      status,
      finding,
      why:   'Wide-open CORS (`*`) on an API with cookies / auth tokens opens up CSRF + token theft.',
    })
  } else {
    cards.push({
      key:   'cors',
      title: 'CORS · Access-Control-Allow-Origin',
      status: 'na',
      finding: 'Not captured · re-audit to populate (runtime CORS probe shipped 2026-05-23).',
      why:   'Wide-open CORS (`*`) on an API with cookies / auth tokens opens up CSRF + token theft.',
    })
  }

  return cards
}

const STATUS_TONE: Record<Status, { fg: string; bg: string; border: string; label: string }> = {
  pass: { fg: '#00D4AA',         bg: 'rgba(0,212,170,0.08)',  border: 'rgba(0,212,170,0.35)',  label: 'PASS' },
  warn: { fg: '#F0C040',         bg: 'rgba(240,192,64,0.08)', border: 'rgba(240,192,64,0.35)', label: 'WARN' },
  fail: { fg: '#C8102E',         bg: 'rgba(200,16,46,0.08)',  border: 'rgba(200,16,46,0.35)',  label: 'FAIL' },
  na:   { fg: 'var(--text-muted)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.12)', label: 'N/A' },
}

interface Props {
  securityHeaders: RuntimeSecurityHeaders | null | undefined
  /** Optional intro line · defaults to a generic "runtime checks" line.
   *  Pass a lane-specific copy ("URL fast lane · this is what we can
   *  see without the source") for stronger context. */
  introNote?: ReactNode
}

export function RuntimeSignalsPanel({ securityHeaders, introNote }: Props) {
  if (!securityHeaders) return null
  const cards = evaluate(securityHeaders)
  const failCount = cards.filter(c => c.status === 'fail').length
  const warnCount = cards.filter(c => c.status === 'warn').length

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
        <div>
          <div className="font-mono text-xs tracking-widest" style={{ color: 'var(--gold-500)' }}>
            // RUNTIME CHECKS
          </div>
          <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {introNote ?? 'What we can see from the live URL alone · response headers + CORS.'}
          </div>
        </div>
        <div className="font-mono text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {failCount > 0 && <span style={{ color: '#C8102E' }}>{failCount} FAIL </span>}
          {warnCount > 0 && <span style={{ color: '#F0C040' }}>· {warnCount} WARN </span>}
          <span>· {cards.length} checks</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {cards.map(c => {
          const tone = STATUS_TONE[c.status]
          return (
            <div
              key={c.key}
              className="p-3"
              style={{
                background:   tone.bg,
                border:       `1px solid ${tone.border}`,
                borderRadius: '2px',
              }}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <div className="font-mono text-[11px] font-medium tracking-wide" style={{ color: 'var(--cream)' }}>
                  {c.title}
                </div>
                <span
                  className="font-mono text-[9px] tracking-widest px-1.5 py-0.5"
                  style={{
                    background: tone.bg,
                    color:      tone.fg,
                    border:     `1px solid ${tone.border}`,
                    borderRadius: '2px',
                  }}
                >
                  {tone.label}
                </span>
              </div>
              <div className="font-light text-[12px] mb-1" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {c.finding}
              </div>
              <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {c.why}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
