import fs from 'fs'
import path from 'path'
import { app } from 'electron'

type NumericStats = {
  count: number
  sum: number
  min: number
  max: number
}

type PromptSectionTokens = Record<string, number>

const PROMPT_SECTION_KEY_ALIASES: Record<string, string> = {
  system: 'system',
  fewshot: 'few_shot',
  few_shot: 'few_shot',
  history: 'history',
  attachment: 'attachments',
  attachments: 'attachments',
  structured: 'structured',
  priority: 'priority',
  semantic: 'semantic',
  question: 'question',
  user: 'question',
  full_context: 'full_context',
  context: 'full_context',
  total: 'total',
}

const STAGE_KEY_ALIASES: Record<string, string> = {
  coordinator: 'coordinator',
  retrieval: 'retrieval',
  context_build: 'context_build',
  stream_ttfb: 'stream_ttfb',
  stream_complete: 'stream_complete',
  end_to_end: 'end_to_end',
}

export type AITelemetryEvent =
  | {
      name: 'coordinator_result'
      data?: { fallback?: boolean; parseError?: boolean }
      ts?: number
    }
  | {
      name: 'overflow_retry'
      data?: { triggered?: boolean }
      ts?: number
    }
  | {
      name: 'prompt_section_tokens'
      data?: { sections?: PromptSectionTokens }
      ts?: number
    }
  | {
      name: 'due_date_exact_match'
      data?: { exactHit?: boolean; hadCandidates?: boolean }
      ts?: number
    }
  | {
      name: 'unsupported_claim_sample'
      data?: { sampled?: boolean; flagged?: boolean }
      ts?: number
    }
  | {
      name: 'followup_reference'
      data?: { attempted?: boolean; resolved?: boolean }
      ts?: number
    }
  | {
      name: 'stage_timing'
      data?: { stage?: string; ms?: number }
      ts?: number
    }
  | {
      name: 'stream_parse_error' | 'request_timeout' | 'request_error'
      data?: Record<string, unknown>
      ts?: number
    }

type TelemetryState = {
  version: 1
  createdAt: string
  updatedAt: string
  coordinator: {
    total: number
    fallback: number
    parseError: number
  }
  overflow: {
    total: number
    retries: number
  }
  promptSections: {
    count: number
    sums: Record<string, number>
  }
  dueDate: {
    total: number
    exactHit: number
    hadCandidates: number
  }
  unsupported: {
    sampled: number
    flagged: number
  }
  followup: {
    attempted: number
    resolved: number
  }
  timings: Record<string, NumericStats>
  errors: {
    streamParseError: number
    requestTimeout: number
    requestError: number
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function createEmptyState(): TelemetryState {
  const now = nowIso()
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    coordinator: { total: 0, fallback: 0, parseError: 0 },
    overflow: { total: 0, retries: 0 },
    promptSections: { count: 0, sums: {} },
    dueDate: { total: 0, exactHit: 0, hadCandidates: 0 },
    unsupported: { sampled: 0, flagged: 0 },
    followup: { attempted: 0, resolved: 0 },
    timings: {},
    errors: { streamParseError: 0, requestTimeout: 0, requestError: 0 },
  }
}

function clampNonNegativeNumber(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function normalizeTelemetryKey(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizePromptSectionKey(value: unknown): string | null {
  const key = normalizeTelemetryKey(value)
  if (!key) return null
  return PROMPT_SECTION_KEY_ALIASES[key] || null
}

function normalizeStageKey(value: unknown): string | null {
  const key = normalizeTelemetryKey(value)
  if (!key) return null
  return STAGE_KEY_ALIASES[key] || null
}

function sanitizePromptSectionSums(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = normalizePromptSectionKey(rawKey)
    if (!key) continue
    out[key] = (out[key] || 0) + clampNonNegativeNumber(rawValue)
  }
  return out
}

function sanitizeTimings(value: unknown): Record<string, NumericStats> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, NumericStats> = {}
  for (const [rawKey, rawStats] of Object.entries(value as Record<string, unknown>)) {
    const key = normalizeStageKey(rawKey)
    if (!key) continue
    if (!rawStats || typeof rawStats !== 'object') continue
    const stats = rawStats as Partial<NumericStats>
    const count = clampNonNegativeNumber(stats.count)
    if (count <= 0) continue
    const sum = clampNonNegativeNumber(stats.sum)
    const min = clampNonNegativeNumber(stats.min)
    const max = clampNonNegativeNumber(stats.max)
    out[key] = { count, sum, min, max }
  }
  return out
}

function toBool(value: unknown): boolean {
  return Boolean(value)
}

function toStats(value: number): NumericStats {
  return { count: 1, sum: value, min: value, max: value }
}

function updateStats(stats: NumericStats | undefined, value: number): NumericStats {
  if (!stats) return toStats(value)
  return {
    count: stats.count + 1,
    sum: stats.sum + value,
    min: Math.min(stats.min, value),
    max: Math.max(stats.max, value),
  }
}

export class AITelemetryStore {
  private readonly filePath: string
  private readonly exportDir: string
  private state: TelemetryState
  private loaded = false
  private saveTimer: NodeJS.Timeout | null = null

  constructor() {
    const userData = app.getPath('userData')
    this.filePath = path.join(userData, 'ai-telemetry.json')
    this.exportDir = path.join(userData, 'telemetry-exports')
    this.state = createEmptyState()
  }

  private ensureLoaded() {
    if (this.loaded) return
    this.loaded = true
    try {
      if (!fs.existsSync(this.filePath)) return
      const raw = fs.readFileSync(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as Partial<TelemetryState>
      if (!parsed || parsed.version !== 1) return
      this.state = {
        ...createEmptyState(),
        ...parsed,
        coordinator: { ...createEmptyState().coordinator, ...(parsed.coordinator || {}) },
        overflow: { ...createEmptyState().overflow, ...(parsed.overflow || {}) },
        promptSections: {
          ...createEmptyState().promptSections,
          ...(parsed.promptSections || {}),
          sums: sanitizePromptSectionSums(parsed.promptSections?.sums),
        },
        dueDate: { ...createEmptyState().dueDate, ...(parsed.dueDate || {}) },
        unsupported: { ...createEmptyState().unsupported, ...(parsed.unsupported || {}) },
        followup: { ...createEmptyState().followup, ...(parsed.followup || {}) },
        timings: sanitizeTimings(parsed.timings),
        errors: { ...createEmptyState().errors, ...(parsed.errors || {}) },
      }
    } catch (e) {
      console.warn('[AI Telemetry] Failed to load existing telemetry file:', e)
      this.state = createEmptyState()
    }
  }

  private scheduleSave() {
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.flushSave()
    }, 250)
  }

  private flushSave() {
    try {
      const dir = path.dirname(this.filePath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2))
    } catch (e) {
      console.warn('[AI Telemetry] Failed to save telemetry file:', e)
    }
  }

  record(event: AITelemetryEvent) {
    this.ensureLoaded()
    this.state.updatedAt = nowIso()

    switch (event.name) {
      case 'coordinator_result': {
        this.state.coordinator.total += 1
        if (toBool(event.data?.fallback)) this.state.coordinator.fallback += 1
        if (toBool(event.data?.parseError)) this.state.coordinator.parseError += 1
        break
      }
      case 'overflow_retry': {
        this.state.overflow.total += 1
        if (toBool(event.data?.triggered)) this.state.overflow.retries += 1
        break
      }
      case 'prompt_section_tokens': {
        const sections = event.data?.sections || {}
        this.state.promptSections.count += 1
        for (const [key, raw] of Object.entries(sections)) {
          const safeKey = normalizePromptSectionKey(key)
          if (!safeKey) continue
          const n = clampNonNegativeNumber(raw)
          this.state.promptSections.sums[safeKey] = (this.state.promptSections.sums[safeKey] || 0) + n
        }
        break
      }
      case 'due_date_exact_match': {
        this.state.dueDate.total += 1
        if (toBool(event.data?.hadCandidates)) this.state.dueDate.hadCandidates += 1
        if (toBool(event.data?.exactHit)) this.state.dueDate.exactHit += 1
        break
      }
      case 'unsupported_claim_sample': {
        if (toBool(event.data?.sampled)) this.state.unsupported.sampled += 1
        if (toBool(event.data?.flagged)) this.state.unsupported.flagged += 1
        break
      }
      case 'followup_reference': {
        if (toBool(event.data?.attempted)) this.state.followup.attempted += 1
        if (toBool(event.data?.resolved)) this.state.followup.resolved += 1
        break
      }
      case 'stage_timing': {
        const stage = normalizeStageKey(event.data?.stage)
        if (!stage) break
        const ms = clampNonNegativeNumber(event.data?.ms)
        this.state.timings[stage] = updateStats(this.state.timings[stage], ms)
        break
      }
      case 'stream_parse_error': {
        this.state.errors.streamParseError += 1
        break
      }
      case 'request_timeout': {
        this.state.errors.requestTimeout += 1
        break
      }
      case 'request_error': {
        this.state.errors.requestError += 1
        break
      }
      default:
        break
    }

    this.scheduleSave()
  }

  getSummary() {
    this.ensureLoaded()
    const c = this.state.coordinator
    const o = this.state.overflow
    const d = this.state.dueDate
    const u = this.state.unsupported
    const f = this.state.followup
    const promptCount = this.state.promptSections.count || 1

    const promptAverages: Record<string, number> = {}
    for (const [k, v] of Object.entries(this.state.promptSections.sums)) {
      promptAverages[k] = Number((v / promptCount).toFixed(2))
    }

    const timingAverages: Record<string, number> = {}
    for (const [k, s] of Object.entries(this.state.timings)) {
      const avg = s.count > 0 ? s.sum / s.count : 0
      timingAverages[k] = Number(avg.toFixed(2))
    }

    return {
      ...this.state,
      rates: {
        coordinator_fallback_rate: c.total > 0 ? c.fallback / c.total : 0,
        coordinator_parse_error_rate: c.total > 0 ? c.parseError / c.total : 0,
        overflow_retry_rate: o.total > 0 ? o.retries / o.total : 0,
        due_date_exact_match_hit_rate: d.total > 0 ? d.exactHit / d.total : 0,
        unsupported_claim_rate: u.sampled > 0 ? u.flagged / u.sampled : 0,
        followup_reference_resolution_rate: f.attempted > 0 ? f.resolved / f.attempted : 0,
      },
      prompt_tokens_by_section_avg: promptAverages,
      stage_timing_ms_avg: timingAverages,
    }
  }

  exportSummary(): { path: string; summary: ReturnType<AITelemetryStore['getSummary']> } {
    const summary = this.getSummary()
    if (!fs.existsSync(this.exportDir)) fs.mkdirSync(this.exportDir, { recursive: true })
    const stamp = nowIso().replace(/[:.]/g, '-')
    const outPath = path.join(this.exportDir, `ai-telemetry-${stamp}.json`)
    fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))
    return { path: outPath, summary }
  }

  reset() {
    this.ensureLoaded()
    this.state = createEmptyState()
    this.flushSave()
  }
}
