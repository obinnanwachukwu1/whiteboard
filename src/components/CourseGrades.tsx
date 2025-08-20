import React from 'react'
import { Card } from './ui/Card'
import { TextField } from './ui/TextField'
import { Button } from './ui/Button'
import { useCourseGradebook } from '../hooks/useCourseGradebook'
import { calculateCourseGrades } from '../utils/gradeCalc'

type Props = {
  courseId: string | number
}

export const CourseGrades: React.FC<Props> = ({ courseId }) => {
  // Keep raw string input so users can type decimals naturally
  const [rawWhatIf, setRawWhatIf] = React.useState<Record<string | number, string>>({})
  const { data, isLoading, error, refetch, isFetching } = useCourseGradebook(courseId)
  const groups = data?.groups || []
  const assignments = data?.assignments || []
  const rawAssignments = data?.raw || []

  // Derive numeric overrides for calculator
  const whatIf = React.useMemo(() => {
    const out: Record<string | number, number | null> = {}
    for (const [k, v] of Object.entries(rawWhatIf)) {
      if (v == null || v.trim() === '') { out[k] = null; continue }
      const n = parseFloat(v)
      out[k] = Number.isFinite(n) ? n : null
    }
    return out
  }, [rawWhatIf])

  const calc = React.useMemo(() => {
    if (!groups.length) return null as any
    return calculateCourseGrades(groups, assignments, { useWeights: 'auto', treatUngradedAsZero: true, whatIf })
  }, [groups, assignments, whatIf])

  function onChangeWhatIf(id: string | number, v: string) {
    setRawWhatIf((prev) => ({ ...prev, [id]: v }))
  }

  function clearOverrides() {
    setRawWhatIf({})
  }

  return (
    <Card className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Grades</h3>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
          <Button size="sm" variant="ghost" onClick={clearOverrides}>Clear What‑If</Button>
        </div>
      </div>
      {(isLoading || isFetching) && <div className="text-slate-500 dark:text-slate-400">Loading…</div>}
      {error && <div className="text-red-600">{String(error.message || error)}</div>}

      {calc && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">Current</div>
            <div className="text-lg font-semibold">{calc.current.totals.percent ?? '—'}%</div>
            <div className="text-xs text-slate-500">{calc.current.totals.pointsEarned} / {calc.current.totals.pointsPossible} pts</div>
          </div>
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">Final (ungraded as 0)</div>
            <div className="text-lg font-semibold">{calc.final.totals.percent ?? '—'}%</div>
            <div className="text-xs text-slate-500">{calc.final.totals.pointsEarned} / {calc.final.totals.pointsPossible} pts</div>
          </div>
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50">
            <div className="text-xs text-slate-500">Weights</div>
            <div className="text-sm">Auto-detected per group</div>
          </div>
        </div>
      )}

      {rawAssignments.length > 0 && (
        <div className="overflow-x-auto">
          {(() => {
            const groupsById = new Map<string, any>(groups.map((g: any) => [String(g.id), g]))
            const byGroup: Record<string, any[]> = {}
            for (const a of rawAssignments) {
              const gid = a?.assignment_group_id != null ? String(a.assignment_group_id) : 'ungrouped'
              if (!byGroup[gid]) byGroup[gid] = []
              byGroup[gid].push(a)
            }
            const order = Object.keys(byGroup)
            return (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-slate-700">
                    <th className="py-2 pr-3">Assignment</th>
                    <th className="py-2 pr-3 w-24 text-right">Pts</th>
                    <th className="py-2 pr-3 w-28 text-right">Score</th>
                    <th className="py-2 pr-3 w-32 text-right">What‑If</th>
                    <th className="py-2 pr-0 w-16 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {order.map((gid) => {
                    const g = groupsById.get(gid)
                    const gName = g?.name || (gid === 'ungrouped' ? 'Ungrouped' : 'Group ' + gid)
                    const weight = g?.groupWeight != null ? Number(g.groupWeight) : null
                    const label = weight && weight > 0 ? `${gName} · ${weight}%` : `${gName}`
                    const list = byGroup[gid]
                    return (
                      <React.Fragment key={gid}>
                        <tr>
                          <td className="pt-4 pb-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide" colSpan={5}>
                            <div className="border-b border-gray-200 dark:border-slate-700 pb-1">{label}</div>
                          </td>
                        </tr>
                        {list.map((a: any) => {
                          const id = a?.id
                          const pts = a?.points_possible ?? null
                          const score = a?.submission?.excused ? 'Excused' : (a?.submission?.score ?? null)
                          const raw = rawWhatIf[id] ?? ''
                          return (
                            <tr key={id} className="border-b border-gray-100 dark:border-slate-800">
                              <td className="py-2 pr-3 max-w-0">
                                <div className="font-medium truncate">{a?.name}</div>
                                <div className="text-xs text-slate-500 whitespace-nowrap">{a?.due_at ? new Date(a?.due_at).toLocaleString() : 'No due date'}</div>
                              </td>
                              <td className="py-2 pr-3 whitespace-nowrap text-right tabular-nums">{pts ?? '—'}</td>
                              <td className="py-2 pr-3 whitespace-nowrap text-right tabular-nums">{score ?? '—'}</td>
                              <td className="py-2 pr-3 w-32 text-right">
                                <TextField
                                  placeholder="—"
                                  value={raw}
                                  onChange={(e) => onChangeWhatIf(id, e.target.value)}
                                  inputMode="decimal"
                                  className="text-right"
                                />
                              </td>
                              <td className="py-2 pr-0 text-right">
                                {a?.html_url && (
                                  <a href={a.html_url} className="text-brand hover:underline" target="_blank" rel="noreferrer">Open</a>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            )
          })()}
        </div>
      )}
    </Card>
  )
}
