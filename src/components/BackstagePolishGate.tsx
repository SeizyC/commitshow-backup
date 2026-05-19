// BackstagePolishGate · OPTIONAL polish form for the public stage
// card (2026-05-16 · downgraded from blocker → polish prompt on
// 2026-05-19 per CEO 피드백 "분석 후부터 바로 가능하게 하자").
//
// History: this used to be a hard guard rail — audition couldn't run
// until description + image were saved. That blocked creators who
// wanted to step on stage immediately after analysis and polish the
// card later. As of 2026-05-19 the audition path no longer routes
// here · component is kept as a soft polish helper that callers may
// reopen via an EDIT-style affordance. The "SAVE & PUT ON STAGE"
// button still works for the case where someone explicitly wants to
// do both at once.

import { useState } from 'react'
import { supabase, type Project, type ProjectImage } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { ProjectImagesPicker } from './ProjectImagesPicker'

interface Props {
  project:               Project
  onSavedAndAuditioned:  () => void | Promise<void>
  onCancel:              () => void
  onNoTicket:            (projectId: string) => void | Promise<void>
}

export function BackstagePolishGate({ project, onSavedAndAuditioned, onCancel, onNoTicket }: Props) {
  const { user } = useAuth()
  const [description, setDescription] = useState(project.description ?? '')
  const [images, setImages]           = useState<ProjectImage[]>(
    Array.isArray(project.images) ? project.images : []
  )
  const [busy, setBusy]   = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = description.trim().length > 0 && images.length > 0

  const saveAndAudition = async () => {
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      // 1. Persist polish to projects · safe to overwrite even if the
      //    creator partially filled before; we just store the current
      //    form state.
      const { error: updErr } = await supabase
        .from('projects')
        .update({
          description: description.trim(),
          images,
        })
        .eq('id', project.id)
      if (updErr) throw new Error(updErr.message)

      // 2. Flip backstage → active via the existing RPC. Same code path
      //    the bare audition button used to call, just chained after
      //    the polish update.
      const { data, error: rpcErr } = await supabase.rpc('audition_project', { p_project_id: project.id })
      if (rpcErr) throw new Error(rpcErr.message)
      const result = data as { ok: boolean; reason?: string }
      if (result.ok) {
        window.dispatchEvent(new CustomEvent('commitshow:tickets-updated'))
        await onSavedAndAuditioned()
        return
      }
      if (result.reason === 'no_ticket') {
        // Stripe checkout · BackstageSection owns the integration
        // because it has the auth context · we just hand off.
        await onNoTicket(project.id)
        return
      }
      throw new Error(result.reason ?? 'Audition failed')
    } catch (e) {
      console.error('[backstage polish gate]', e)
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="mt-2 card-navy p-5"
      style={{
        borderRadius: '2px',
        border: '1px solid rgba(240,192,64,0.32)',
        background: 'rgba(240,192,64,0.04)',
      }}
    >
      <div className="font-mono text-xs tracking-widest mb-2" style={{ color: 'var(--gold-500)' }}>
        // POLISH YOUR STAGE CARD
      </div>
      <h4 className="font-display font-bold text-lg mb-1" style={{ color: 'var(--cream)' }}>
        Add a description + image
      </h4>
      <p className="font-light text-sm mb-5" style={{ color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        These show on your public card · what other creators and Scouts see before they click through.
        Optional · one sentence and one screenshot is plenty to start with.
      </p>

      <div className="mb-4">
        <label className="block font-mono text-[10px] tracking-widest mb-1.5" style={{ color: 'var(--text-label)' }}>
          ONE-LINE DESCRIPTION
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What does your project do?"
          maxLength={200}
          className="w-full font-mono text-sm p-3"
          style={{
            background:   'var(--navy-950)',
            color:        'var(--cream)',
            border:       '1px solid rgba(255,255,255,0.12)',
            borderRadius: '2px',
          }}
        />
      </div>

      <div className="mb-5">
        <label className="block font-mono text-[10px] tracking-widest mb-2" style={{ color: 'var(--text-label)' }}>
          STAGE IMAGE · 1 to 3
        </label>
        {/* ProjectImagesPicker calls uploadThumbnail(processed, user.id) ·
            we need a signed-in user to write to the storage bucket. The
            guard here covers the (very) unlikely race where the auth
            state flushed between BackstageSection mounting and this
            click. */}
        {user?.id ? (
          <ProjectImagesPicker value={images} onChange={setImages} max={3} />
        ) : (
          <div className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Sign in to upload images.
          </div>
        )}
      </div>

      {error && (
        <div
          className="mb-3 px-3 py-2 font-mono text-[11px]"
          style={{
            background: 'rgba(200,16,46,0.08)',
            border: '1px solid rgba(200,16,46,0.4)',
            borderRadius: '2px',
            color: 'var(--scarlet)',
          }}
        >
          {error}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={saveAndAudition}
          disabled={!canSubmit || busy}
          className="px-4 py-2 font-mono text-xs font-medium tracking-wide whitespace-nowrap"
          style={{
            background:   canSubmit && !busy ? 'var(--gold-500)' : 'rgba(240,192,64,0.35)',
            color:        'var(--navy-900)',
            border:       'none',
            borderRadius: '2px',
            cursor:       canSubmit && !busy ? 'pointer' : 'not-allowed',
          }}
        >
          {busy ? 'PUTTING ON STAGE…' : 'SAVE & PUT ON STAGE →'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="px-4 py-2 font-mono text-xs tracking-wide"
          style={{
            background:   'transparent',
            color:        'var(--cream)',
            border:       '1px solid rgba(248,245,238,0.18)',
            borderRadius: '2px',
            cursor:       'pointer',
          }}
        >
          CANCEL
        </button>
      </div>
      {!canSubmit && (
        <p className="font-mono text-[10px] mt-3" style={{ color: 'var(--text-muted)' }}>
          {description.trim() ? '' : '· description required'}
          {description.trim() ? '' : ' '}
          {images.length > 0 ? '' : '· at least one image required'}
        </p>
      )}
    </div>
  )
}
