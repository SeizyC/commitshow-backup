// Open Mic post draft generator · seeds NewCommunityPostPage with
// title + tldr + body + tags pulled from data the audit engine
// ALREADY wrote on each snapshot. CEO 피드백 2026-05-18 · no Claude
// call per share — the snapshot's rich_analysis is already a
// freshly-generated writeup; we slice it into a post draft.
//
// Two axes drive content:
//
//   (1) `kind` · what event this share is celebrating
//        · 'climb'     — band moved up after re-audit
//        · 'audition'  — backstage → active (just put it on stage)
//        · 'encore'    — score crossed the 84 line · permanent badge
//
//   (2) `audit_count` · which variant within the kind to use
//        Each kind has 3-4 templates rotated deterministically by
//        audit_count so a builder who triggers the same kind twice
//        gets a different hook. Reproducible (same snapshot → same
//        variant) so a refresh doesn't churn the form.

import type { Project } from './supabase'

export type ShareKind = 'climb' | 'audition' | 'encore'

interface BuildArgs {
  kind:           ShareKind
  project:        Project
  snapshotRich:   Record<string, unknown> | null
  previousBand?:  string         // required for 'climb'
  currentBand:    string
  score:          number
}

interface Seed {
  title: string
  tldr:  string
  body:  string
  tags:  string[]
}

export function buildOpenMicSeed(args: BuildArgs): Seed {
  const ctx = deriveContext(args)
  if (args.kind === 'climb')    return seedClimb(ctx)
  if (args.kind === 'audition') return seedAudition(ctx)
  return seedEncore(ctx)
}

// ── Derived context shared across all kind builders ─────────

interface Context {
  kind:        ShareKind
  projectName: string
  score:       number
  previousBand?: string
  currentBand:   string
  weaknesses:  string[]
  strengths:   string[]
  honest:      string | null
  tldr:        string | null
  variantIdx:  number
  auditCount:  number
}

function deriveContext({ kind, project, snapshotRich, previousBand, currentBand, score }: BuildArgs): Context {
  const auditCount = project.audit_count ?? 0
  return {
    kind,
    projectName: (project.project_name || 'this build').trim(),
    score,
    previousBand,
    currentBand,
    weaknesses: extractWeaknesses(snapshotRich, 3),
    strengths:  extractStrengths(snapshotRich, 3),
    honest:     extractHonestParagraph(snapshotRich),
    tldr:       extractTldr(snapshotRich),
    // Per-kind rotation · variant count differs per kind below.
    // Hashes by (auditCount + score) so two audits with identical
    // counts but different scores still pick different variants.
    variantIdx: (auditCount + score) >>> 0,
    auditCount,
  }
}

// ── kind: 'climb' · iterative builder energy ────────────────
// Triggered from AuditCoachPanel "Share your climb on Open Mic"
// when previousBand → currentBand actually moved up. Tone: cycle
// notes, "here's what worked", invites comparing notes.

function seedClimb(c: Context): Seed {
  const TAGS = ['vibe-life', 'ship-log']
  const bandLine = c.previousBand && c.previousBand !== c.currentBand
    ? `${c.previousBand} → ${c.currentBand} · ${c.score}/100`
    : `${c.currentBand} · ${c.score}/100`
  const idx = c.variantIdx % 4

  // V0 · honest-evaluation lead (engine prose as the hook)
  if (idx === 0 && c.honest) {
    return {
      title: `${c.projectName} climbed to ${c.currentBand} · ${c.score}/100`,
      tldr:  c.honest.slice(0, 200),
      body: [
        c.honest,
        '',
        `### ${bandLine}`,
        '',
        '### What I shipped this cycle',
        '- _your turn_',
        '- _your turn_',
        '',
        ...(c.weaknesses.length > 0 ? [
          '### What the audit flagged next',
          ...c.weaknesses.map(w => `- ${w}`),
          '',
        ] : []),
        `— ${c.projectName} on commit.show`,
      ].join('\n'),
      tags: TAGS,
    }
  }

  // V1 · strength-first (invites validation, less help-begging)
  if (idx === 1 && c.strengths.length > 0) {
    return {
      title: `${c.score}/100 · ${c.strengths[0].slice(0, 60)}`,
      tldr:  `${c.projectName} · ${bandLine} · what's carrying it + what's next.`,
      body: [
        `## What's carrying ${c.projectName} right now`,
        '',
        ...c.strengths.map(s => `- ${s}`),
        '',
        `### ${bandLine}`,
        '',
        '### Next cycle target',
        c.weaknesses[0] ? `- ${c.weaknesses[0]}` : '- _your turn_',
        '',
        '### Open question',
        '_anyone on a similar stack found a faster path through this?_',
        '',
        `— ${c.projectName} on commit.show`,
      ].join('\n'),
      tags: TAGS,
    }
  }

  // V2 · changelog tone (metrics-first builders)
  if (idx === 2) {
    return {
      title: c.previousBand && c.previousBand !== c.currentBand
        ? `${c.previousBand.toLowerCase()} → ${c.currentBand.toLowerCase()} · ${c.projectName} (${c.score}/100)`
        : `${c.projectName} re-audit · ${c.currentBand.toLowerCase()} held at ${c.score}/100`,
      tldr:  c.previousBand && c.previousBand !== c.currentBand
        ? `Score moved ${c.previousBand} → ${c.currentBand}. Here's the cycle that did it.`
        : `Re-audit didn't move the band. Here's what's still in the way.`,
      body: [
        `## ${bandLine}`,
        '',
        '### Changes shipped',
        '- _what I touched · be specific so others can copy it_',
        '- ',
        '',
        ...(c.weaknesses.length > 0 ? [
          '### Still on the audit (next 3 to fix)',
          ...c.weaknesses.map(w => `- ${w}`),
          '',
        ] : [
          '### Audit is quiet · ship time',
          'No fresh concerns surfaced this round. Looking for visual / UX feedback before audition.',
          '',
        ]),
        '### What I\'d trade tips for',
        '_drop a comment if you\'ve hit one of these · happy to compare notes._',
        '',
        `— ${c.projectName} on commit.show`,
      ].join('\n'),
      tags: TAGS,
    }
  }

  // V3 · question-first (open conversation)
  return {
    title: c.weaknesses[0]
      ? `Working on: ${c.weaknesses[0].slice(0, 70)}`
      : `${c.projectName} · cycle ${c.auditCount} · ${c.score}/100`,
    tldr:  c.tldr ? c.tldr.slice(0, 200) : `${c.projectName} is at ${c.currentBand} · here's what I'm working on.`,
    body: [
      '## Where I\'m at',
      '',
      c.tldr ? `> ${c.tldr}` : `${c.projectName} is sitting at ${c.currentBand} (${c.score}/100) after this cycle.`,
      '',
      ...(c.weaknesses.length > 0 ? [
        '### The audit just flagged these',
        ...c.weaknesses.map(w => `- ${w}`),
        '',
      ] : []),
      '### What I\'m about to try',
      '- _your turn — describe the next move_',
      '',
      '### Where I\'d love input',
      '- _what hurts most about your current attempt?_',
      '',
      `— ${c.projectName} on commit.show`,
    ].join('\n'),
    tags: TAGS,
  }
}

// ── kind: 'audition' · debut energy ─────────────────────────
// Triggered after audition_project RPC flips backstage → active.
// Tone: announcement, "just put it on stage", invites first
// forecasts / applauds / feedback. Less retrospective than climb.

function seedAudition(c: Context): Seed {
  const TAGS = ['vibe-life', 'on-stage', 'audition']
  const idx = c.variantIdx % 3

  // V0 · headline announcement
  if (idx === 0) {
    return {
      title: `Just put ${c.projectName} on stage · ${c.score}/100`,
      tldr:  c.tldr
        ? `On stage now: ${c.tldr.slice(0, 150)}`
        : `${c.projectName} just left backstage. Looking for the first round of forecasts + feedback.`,
      body: [
        `## ${c.projectName} is on stage`,
        '',
        c.honest ? c.honest : `Just auditioned · current score ${c.score}/100 (${c.currentBand}).`,
        '',
        ...(c.strengths.length > 0 ? [
          '### What I\'m proudest of',
          ...c.strengths.slice(0, 2).map(s => `- ${s}`),
          '',
        ] : []),
        ...(c.weaknesses.length > 0 ? [
          '### What I know I still need',
          ...c.weaknesses.slice(0, 2).map(w => `- ${w}`),
          '',
        ] : []),
        '### What I\'d love',
        '- a forecast (or two)',
        '- specific feedback on the weakest axis',
        '',
        `— ${c.projectName} on commit.show`,
      ].join('\n'),
      tags: TAGS,
    }
  }

  // V1 · invite the room (lower-key audition)
  if (idx === 1) {
    return {
      title: `${c.projectName} just hit the stage · drop a forecast?`,
      tldr:  `Score sits at ${c.score}/100 (${c.currentBand}). First time public · what would you push on first?`,
      body: [
        `## Live on stage now`,
        '',
        c.tldr ? `> ${c.tldr}` : `${c.projectName} just left backstage.`,
        '',
        `Current score: **${c.score}/100** (${c.currentBand})`,
        '',
        "### If you've got 30 seconds",
        '- drop a forecast (will it cross 84?)',
        '- comment on the single biggest blocker you see',
        '- applaud if you would back it yourself',
        '',
        `Audit report on commit.show · I'll be in the comments.`,
        '',
        `— ${c.projectName}`,
      ].join('\n'),
      tags: TAGS,
    }
  }

  // V2 · brief + ask (founder voice)
  return {
    title: c.tldr
      ? `Auditioning ${c.projectName}: ${c.tldr.slice(0, 60)}`
      : `Auditioning ${c.projectName} · ${c.score}/100`,
    tldr:  c.tldr ?? `${c.projectName} is on stage. Built to ship · here's what it is + what I'd love feedback on.`,
    body: [
      `## What it is`,
      '',
      c.tldr ?? '_one-line pitch_',
      '',
      ...(c.strengths.length > 0 ? [
        '## What\'s already solid',
        ...c.strengths.slice(0, 3).map(s => `- ${s}`),
        '',
      ] : []),
      ...(c.weaknesses.length > 0 ? [
        '## Where I know it\'s soft',
        ...c.weaknesses.slice(0, 3).map(w => `- ${w}`),
        '',
      ] : []),
      `## Score · ${c.score}/100 (${c.currentBand})`,
      '',
      "### What I'd love from this room",
      "_drop a forecast · tell me which weakness to attack first · or just lurk and applaud if you've built something similar._",
      '',
      `— ${c.projectName} on commit.show`,
    ].join('\n'),
    tags: TAGS,
  }
}

// ── kind: 'encore' · milestone energy ───────────────────────
// Triggered when score crosses 84 (the Encore line · permanent badge).
// Tone: real achievement, looks back at the climb, thanks the loop.

function seedEncore(c: Context): Seed {
  const TAGS = ['vibe-life', 'encore', 'milestone']
  const idx = c.variantIdx % 3

  // V0 · the milestone announcement
  if (idx === 0) {
    return {
      title: `${c.projectName} just crossed Encore · ${c.score}/100`,
      tldr:  c.tldr
        ? `Encore badge unlocked. ${c.tldr.slice(0, 150)}`
        : `${c.projectName} crossed the 84 line. Permanent Encore badge unlocked.`,
      body: [
        `## ${c.projectName} · Encore unlocked`,
        '',
        c.honest ? c.honest : `Just crossed the 84 line on commit.show. Permanent Encore badge attached to the card.`,
        '',
        `**Score · ${c.score}/100 (${c.currentBand})**`,
        '',
        ...(c.strengths.length > 0 ? [
          '### What got it across the line',
          ...c.strengths.slice(0, 3).map(s => `- ${s}`),
          '',
        ] : []),
        '### What I learned',
        '_your turn — what surprised you about the climb?_',
        '',
        '### What\'s next',
        "_keep the streak · push the next project · share what you'd do differently_",
        '',
        `— ${c.projectName} on commit.show`,
      ].join('\n'),
      tags: TAGS,
    }
  }

  // V1 · cycle retrospective
  if (idx === 1) {
    return {
      title: `Encore at ${c.score}/100 · ${c.auditCount} audit cycle${c.auditCount === 1 ? '' : 's'} to get here`,
      tldr:  `What ${c.auditCount} re-audit cycles taught me about ${c.projectName}.`,
      body: [
        `## ${c.projectName} · Encore (${c.score}/100)`,
        '',
        `${c.auditCount} audit cycle${c.auditCount === 1 ? '' : 's'} to cross the 84 line.`,
        '',
        '### The cycles that moved the most',
        '- _your turn — which fix had the biggest score impact?_',
        '- ',
        '',
        '### The cycles that felt wasted',
        '- _your turn — what would you skip if you ran this again?_',
        '',
        ...(c.weaknesses.length > 0 ? [
          '### Still on my list (not blocking Encore but worth fixing)',
          ...c.weaknesses.slice(0, 3).map(w => `- ${w}`),
          '',
        ] : []),
        '### Anyone trying to cross? Drop a question.',
        '',
        `— ${c.projectName} on commit.show`,
      ].join('\n'),
      tags: TAGS,
    }
  }

  // V2 · thank-the-loop
  return {
    title: `${c.projectName} is Encore · what the loop taught me`,
    tldr:  `${c.projectName} crossed 84 (${c.score}/100). Few things the audit-fix-repeat loop got right.`,
    body: [
      `## Encore · ${c.score}/100`,
      '',
      `${c.projectName} just crossed the line. The audit-fix-repeat loop on commit.show ran ${c.auditCount} cycle${c.auditCount === 1 ? '' : 's'} on this.`,
      '',
      ...(c.strengths.length > 0 ? [
        '### What the audit caught that I missed',
        ...c.strengths.slice(0, 2).map(s => `- ${s}`),
        '',
      ] : []),
      "### What I'd do differently next project",
      '- _your turn_',
      '',
      '### Anyone iterating right now?',
      "_happy to compare notes · drop a comment with where you're stuck._",
      '',
      `— ${c.projectName} on commit.show`,
    ].join('\n'),
    tags: TAGS,
  }
}

// ── Snapshot extractors · tolerant of shape drift ───────────

function extractWeaknesses(rich: Record<string, unknown> | null, n: number): string[] {
  const raw = (rich as { scout_brief?: { weaknesses?: unknown } } | null)?.scout_brief?.weaknesses
  return normalizeBullets(raw, n)
}

function extractStrengths(rich: Record<string, unknown> | null, n: number): string[] {
  const raw = (rich as { scout_brief?: { strengths?: unknown } } | null)?.scout_brief?.strengths
  return normalizeBullets(raw, n)
}

function normalizeBullets(raw: unknown, n: number): string[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, n).map(b => {
    if (typeof b === 'string') return b
    if (b && typeof b === 'object' && 'bullet' in b && typeof (b as { bullet: unknown }).bullet === 'string') {
      return (b as { bullet: string }).bullet
    }
    return ''
  }).filter(Boolean)
}

function extractHonestParagraph(rich: Record<string, unknown> | null): string | null {
  const raw = (rich as { honest_evaluation?: unknown } | null)?.honest_evaluation
  if (typeof raw !== 'string' || !raw.trim()) return null
  const firstPara = raw.split(/\n\s*\n/)[0].trim()
  if (firstPara.length < 40) return null
  return firstPara.length > 600 ? firstPara.slice(0, 597) + '…' : firstPara
}

function extractTldr(rich: Record<string, unknown> | null): string | null {
  const raw = (rich as { tldr?: unknown } | null)?.tldr
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}
