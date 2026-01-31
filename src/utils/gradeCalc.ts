// Grade calculator utilities for Canvas-like gradebooks with optional weights and drop rules

export type SubmissionLike = {
  score?: number | null
  excused?: boolean
  missing?: boolean
  late?: boolean
  gradedAt?: string | null
}

export type AssignmentInput = {
  id: string | number
  name?: string
  groupId?: string | number
  pointsPossible?: number | null
  published?: boolean
  dueAt?: string | null
  submission?: SubmissionLike | null
}

export type DropRules = {
  drop_lowest?: number | null
  drop_highest?: number | null
  never_drop?: Array<string | number> | null
}

export type AssignmentGroupInput = {
  id: string | number
  name?: string
  groupWeight?: number | null // percent (0-100)
  rules?: DropRules | null
}

export type WhatIfOverrides = Record<string | number, number | null>

export type GroupResult = {
  groupId: string | number
  name?: string
  weight: number // percent (0-100)
  pointsEarned: number
  pointsPossible: number
  percent: number | null // 0-100, null when no possible
  weightedScore: number // 0-100 scale already multiplied by weight fraction
  droppedIds: Array<string | number>
}

export type TotalsResult = {
  pointsEarned: number
  pointsPossible: number
  percent: number | null // 0-100
}

export type CalcResult = {
  current: { totals: TotalsResult; groups: GroupResult[] }
  final: { totals: TotalsResult; groups: GroupResult[] }
}

export type CalcOptions = {
  // If true, treat ungraded as 0 for the "final" scenario; for current, ungraded are excluded
  treatUngradedAsZero?: boolean
  // If 'auto', use weights if any group has a weight > 0; if boolean, force behavior
  useWeights?: boolean | 'auto'
  // Apply drop rules when present (default true)
  applyDropRules?: boolean
  // What-if overrides: assignmentId -> score (null means clear score)
  whatIf?: WhatIfOverrides
}

const toKey = (id: string | number | undefined | null) => (id == null ? '' : String(id))

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0)
}

type ScoreRecord = { id: string | number; score: number; possible: number }

function applyDropRules(
  records: ScoreRecord[],
  rules?: DropRules | null,
): { kept: ScoreRecord[]; dropped: ScoreRecord[] } {
  if (!records.length) return { kept: [], dropped: [] }
  if (!rules) return { kept: records.slice(), dropped: [] }
  const never = new Set((rules.never_drop || []).map(toKey))

  const candidates = records.filter((r) => !never.has(toKey(r.id)) && r.possible > 0)
  const others = records.filter((r) => never.has(toKey(r.id)) || r.possible <= 0)

  const working = candidates.slice()
  const dropped: ScoreRecord[] = []

  const dropLowest = Math.max(0, Number(rules.drop_lowest || 0))
  if (dropLowest > 0 && working.length) {
    // lowest by percent (score/possible)
    working
      .slice()
      .sort((a, b) => a.score / a.possible - b.score / b.possible)
      .slice(0, Math.min(dropLowest, working.length))
      .forEach((r) => {
        const idx = working.findIndex((x) => x.id === r.id)
        if (idx >= 0) dropped.push(...working.splice(idx, 1))
      })
  }

  const dropHighest = Math.max(0, Number(rules.drop_highest || 0))
  if (dropHighest > 0 && working.length) {
    working
      .slice()
      .sort((a, b) => b.score / b.possible - a.score / a.possible)
      .slice(0, Math.min(dropHighest, working.length))
      .forEach((r) => {
        const idx = working.findIndex((x) => x.id === r.id)
        if (idx >= 0) dropped.push(...working.splice(idx, 1))
      })
  }

  return { kept: [...working, ...others], dropped }
}

function calcByGroups(
  groups: AssignmentGroupInput[],
  assignments: AssignmentInput[],
  opts: Required<Pick<CalcOptions, 'treatUngradedAsZero' | 'applyDropRules'>> & {
    useWeights: boolean
    whatIf?: WhatIfOverrides
  },
) {
  const whatIf: WhatIfOverrides = opts.whatIf || {}
  const byGroup = new Map<string, AssignmentInput[]>()
  for (const a of assignments) {
    const gid = toKey(a.groupId || 'ungrouped')
    if (!byGroup.has(gid)) byGroup.set(gid, [])
    byGroup.get(gid)!.push(a)
  }

  const groupsMap = new Map(groups.map((g) => [toKey(g.id), g]))

  const groupResults: GroupResult[] = []
  for (const [gid, list] of byGroup.entries()) {
    const g =
      groupsMap.get(gid) ||
      ({ id: gid, name: 'Ungrouped', groupWeight: 0, rules: null } as AssignmentGroupInput)
    const weight = Number(g.groupWeight || 0)

    const recs: ScoreRecord[] = []
    for (const a of list) {
      const possible = Math.max(0, Number(a.pointsPossible || 0))
      if (!a.published && a.published !== undefined) continue // honor explicit unpublished
      if (a.submission?.excused) continue // Canvas excludes excused from totals

      // what-if override takes precedence
      const override = Object.prototype.hasOwnProperty.call(whatIf, toKey(a.id))
        ? whatIf[a.id]
        : undefined
      const raw = override !== undefined ? override : a.submission?.score

      if (opts.treatUngradedAsZero) {
        const score = Math.max(0, Number(raw ?? 0))
        recs.push({ id: a.id, score, possible })
      } else {
        if (raw == null || Number.isNaN(Number(raw))) {
          // exclude ungraded entirely from current
          continue
        }
        recs.push({ id: a.id, score: Math.max(0, Number(raw)), possible })
      }
    }

    const { kept, dropped } = opts.applyDropRules
      ? applyDropRules(recs, g.rules)
      : { kept: recs, dropped: [] }
    const pe = sum(kept.map((r) => r.score))
    const pp = sum(kept.map((r) => r.possible))
    const percent = pp > 0 ? (pe / pp) * 100 : null
    groupResults.push({
      groupId: g.id,
      name: g.name,
      weight,
      pointsEarned: round2(pe),
      pointsPossible: round2(pp),
      percent: percent == null ? null : round2(percent),
      weightedScore: 0, // fill later after normalization
      droppedIds: dropped.map((d) => d.id),
    })
  }

  // Normalize and compute weighted contributions if needed
  let totalEarned = 0
  let totalPossible = 0
  for (const gr of groupResults) {
    totalEarned += gr.pointsEarned
    totalPossible += gr.pointsPossible
  }

  let percent: number | null
  if (opts.useWeights) {
    // Re-normalize weight across groups that have any pointsPossible (Canvas current grade behavior)
    const eligible = groupResults.filter((g) => g.pointsPossible > 0)
    const weightSum = sum(eligible.map((g) => g.weight)) || 0
    let weighted = 0
    for (const g of groupResults) {
      const effWeight = eligible.includes(g) && weightSum > 0 ? g.weight / weightSum : 0
      const contrib = g.percent == null ? 0 : (g.percent / 100) * effWeight
      g.weightedScore = round2(contrib * 100)
      weighted += contrib
    }
    percent = round2(weighted * 100)
  } else {
    percent = totalPossible > 0 ? round2((totalEarned / totalPossible) * 100) : null
    for (const g of groupResults) {
      g.weightedScore = 0
    }
  }

  return {
    totals: { pointsEarned: round2(totalEarned), pointsPossible: round2(totalPossible), percent },
    groups: groupResults,
  }
}

export function calculateCourseGrades(
  groups: AssignmentGroupInput[],
  assignments: AssignmentInput[],
  options: CalcOptions = {},
): CalcResult {
  const treatUngradedAsZero = options.treatUngradedAsZero ?? true
  const applyDropRules = options.applyDropRules ?? true

  // auto-detect weights
  let useWeights: boolean
  if (options.useWeights === 'auto' || options.useWeights === undefined) {
    useWeights = groups.some((g) => Number(g.groupWeight || 0) > 0)
  } else {
    useWeights = !!options.useWeights
  }

  const current = calcByGroups(groups, assignments, {
    treatUngradedAsZero: false,
    applyDropRules,
    useWeights,
    whatIf: options.whatIf,
  })
  const final = calcByGroups(groups, assignments, {
    treatUngradedAsZero,
    applyDropRules,
    useWeights,
    whatIf: options.whatIf,
  })

  return { current, final }
}

// Helper to normalize REST payloads into AssignmentInput/AssignmentGroupInput
export function toAssignmentInputsFromRest(assignments: any[]): AssignmentInput[] {
  return (assignments || []).map((a) => ({
    id: a?.id ?? a?._id,
    name: a?.name,
    groupId: a?.assignment_group_id,
    pointsPossible: a?.points_possible,
    published: a?.published ?? (a?.workflow_state === 'published' ? true : undefined),
    dueAt: a?.due_at,
    submission: a?.submission
      ? {
          score: a.submission?.score,
          excused: a.submission?.excused,
          missing: a.submission?.missing,
          late: a.submission?.late,
          gradedAt: a.submission?.graded_at,
        }
      : null,
  }))
}

export function toAssignmentGroupInputsFromRest(groups: any[]): AssignmentGroupInput[] {
  return (groups || []).map((g) => ({
    id: g?.id,
    name: g?.name,
    groupWeight: g?.group_weight,
    rules: g?.rules || null,
  }))
}
