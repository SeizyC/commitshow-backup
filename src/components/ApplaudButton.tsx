// Polymorphic applaud toggle (§7.5 · §13-B).
// Works on any target_type: product · comment · build_log · stack · brief · recommit.
// One click = on/off. Count updates optimistically; falls back on error.

import { useEffect, useState } from 'react'
import {
  castApplaud,
  removeApplaud,
  countApplauds,
  hasApplauded,
  CannotApplaudOwnContentError,
} from '../lib/applaud'
import type { ApplaudTargetType } from '../lib/supabase'
import { IconApplaud } from './icons'

export interface ApplaudButtonProps {
  targetType:     ApplaudTargetType
  targetId:       string
  viewerMemberId: string | null         // null → unauth
  isOwnContent?:  boolean               // render disabled with tooltip
  size?:          'sm' | 'md' | 'lg'
  /**
   * 'icon'  = monochrome SVG (§4 default — used on community posts etc.)
   * 'emoji' = 👏 emoji · carved-out exception per §4 for the project detail
   *           Forecast/Applaud pair (CTA differentiation from other pills).
   */
  variant?:       'icon' | 'emoji'
  className?:     string
  onChange?:      (active: boolean, count: number) => void
  // When true, hide the count label (pure icon button).
  hideCount?:     boolean
  // Override button label ('Applaud' default).
  label?:         string
  // 2026-05-19 · when set, the count renders as a SEPARATE adjacent
  // clickable pill (not inside the main applaud toggle), and clicking
  // the count fires onCountClick. Lets the parent open an "applauders
  // list" modal without conflicting with the applaud toggle on the
  // icon · CEO 피드백 · "박수 아이콘과 숫자 분리해서 숫자 부분 누르면
  // 박수친 사람들 보여주게".
  onCountClick?:  () => void
}

export function ApplaudButton({
  targetType,
  targetId,
  viewerMemberId,
  isOwnContent = false,
  size = 'md',
  variant = 'icon',
  className,
  onChange,
  hideCount = false,
  label,
  onCountClick,
}: ApplaudButtonProps) {
  const [active, setActive]   = useState(false)
  const [count, setCount]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const [c, mine] = await Promise.all([
        countApplauds(targetType, targetId),
        viewerMemberId
          ? hasApplauded({ targetType, targetId, memberId: viewerMemberId })
          : Promise.resolve(false),
      ])
      if (cancelled) return
      setCount(c)
      setActive(mine)
      setLoading(false)
    })().catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [targetType, targetId, viewerMemberId])

  const disabled = !viewerMemberId || isOwnContent || loading || busy

  const tooltip = !viewerMemberId
    ? 'Sign in to applaud'
    : isOwnContent
      ? "You can't applaud your own content"
      : active
        ? 'Remove applaud'
        : 'Applaud'

  async function onClick() {
    if (disabled || !viewerMemberId) return
    setBusy(true)
    setError(null)

    // Optimistic flip
    const nextActive = !active
    const nextCount  = count + (nextActive ? 1 : -1)
    setActive(nextActive)
    setCount(nextCount)

    try {
      const ref = { targetType, targetId, memberId: viewerMemberId }
      if (nextActive) {
        await castApplaud(ref)
      } else {
        await removeApplaud(ref)
      }
      onChange?.(nextActive, nextCount)
    } catch (e) {
      // Rollback
      setActive(active)
      setCount(count)
      if (e instanceof CannotApplaudOwnContentError) {
        setError("You can't applaud your own content")
      } else {
        setError('Something went wrong. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  const padY     = size === 'sm' ? 0.25 : size === 'lg' ? 0.75  : 0.4
  const padX     = size === 'sm' ? 0.55 : size === 'lg' ? 1.25  : 0.75
  const fontSize = size === 'sm' ? 11   : size === 'lg' ? 16    : 12
  const emojiSize = size === 'sm' ? 14  : size === 'lg' ? 24    : 16
  const iconSize  = size === 'sm' ? 12  : size === 'lg' ? 18    : 14

  // Split-mode · 2026-05-19 · when onCountClick is supplied, the
  // count renders as a SEPARATE adjacent pill so it gets its own
  // click target (open applauders modal) without colliding with the
  // applaud toggle on the icon. Inline-count rendering inside the
  // main button is suppressed in this mode. Single-button mode
  // (default) keeps the original behaviour.
  const showInlineCount   = !hideCount && !onCountClick
  const showExternalCount = !hideCount && !!onCountClick

  const applaudBtn = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={error ?? tooltip}
      aria-pressed={active}
      aria-label={tooltip}
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           variant === 'emoji' ? '0.5em' : '0.4em',
        padding:       `${padY}rem ${padX}rem`,
        fontFamily:    'DM Mono, monospace',
        fontSize,
        lineHeight:    1,
        background:    active ? 'rgba(240,192,64,0.12)' : 'transparent',
        color:         active ? 'var(--gold-500)' : 'var(--text-label)',
        border:        `1px solid ${active ? 'rgba(240,192,64,0.45)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius:  '2px',
        cursor:        disabled ? 'not-allowed' : 'pointer',
        opacity:       disabled && !active ? 0.55 : 1,
        transition:    'color 120ms, background 120ms, border-color 120ms, box-shadow 120ms',
        boxShadow:     active && size === 'lg' ? '0 0 24px rgba(240,192,64,0.18)' : 'none',
      }}
      onMouseEnter={e => {
        if (disabled) return
        e.currentTarget.style.borderColor = 'rgba(240,192,64,0.6)'
        if (size === 'lg') e.currentTarget.style.boxShadow = '0 0 32px rgba(240,192,64,0.3)'
        if (!active) e.currentTarget.style.color = 'var(--cream)'
      }}
      onMouseLeave={e => {
        if (disabled) return
        e.currentTarget.style.borderColor = active
          ? 'rgba(240,192,64,0.45)'
          : 'rgba(255,255,255,0.12)'
        if (size === 'lg') {
          e.currentTarget.style.boxShadow = active ? '0 0 24px rgba(240,192,64,0.18)' : 'none'
        }
        if (!active) e.currentTarget.style.color = 'var(--text-label)'
      }}
    >
      {variant === 'emoji' ? (
        <span
          aria-hidden="true"
          style={{
            fontSize: emojiSize,
            lineHeight: 1,
            display: 'inline-block',
            filter: active ? 'saturate(1.15)' : 'grayscale(0.2)',
            transform: active ? 'scale(1.08)' : 'scale(1)',
            transition: 'transform 120ms, filter 120ms',
          }}
        >
          👏
        </span>
      ) : (
        <IconApplaud size={iconSize} />
      )}
      {label && <span>{label}</span>}
      {showInlineCount && (
        <span className="tabular-nums">{count}</span>
      )}
    </button>
  )

  if (!showExternalCount) {
    return <span className={className}>{applaudBtn}</span>
  }

  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
      {applaudBtn}
      <button
        type="button"
        onClick={() => onCountClick?.()}
        title={`See who applauded · ${count}`}
        aria-label={`See ${count} applauder${count === 1 ? '' : 's'}`}
        disabled={count === 0}
        style={{
          display:       'inline-flex',
          alignItems:    'center',
          padding:       `${padY}rem ${padX * 0.75}rem`,
          fontFamily:    'DM Mono, monospace',
          fontSize,
          lineHeight:    1,
          background:    'transparent',
          color:         count > 0 ? 'var(--cream)' : 'var(--text-muted)',
          border:        '1px solid rgba(255,255,255,0.12)',
          borderRadius:  '2px',
          cursor:        count > 0 ? 'pointer' : 'default',
          transition:    'color 120ms, border-color 120ms',
        }}
        onMouseEnter={e => {
          if (count === 0) return
          e.currentTarget.style.borderColor = 'rgba(240,192,64,0.45)'
          e.currentTarget.style.color = 'var(--gold-500)'
        }}
        onMouseLeave={e => {
          if (count === 0) return
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
          e.currentTarget.style.color = 'var(--cream)'
        }}
      >
        <span className="tabular-nums">{count}</span>
      </button>
    </span>
  )
}
