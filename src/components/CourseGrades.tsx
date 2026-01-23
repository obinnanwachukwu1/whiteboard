import React from 'react'
// no Card wrapper; rendered within page container
import { Button } from './ui/Button'
import { Pencil, RotateCcw } from 'lucide-react'
import { useCourseGradebook } from '../hooks/useCourseGradebook'
import { useQueryClient } from '@tanstack/react-query'
import { calculateCourseGrades } from '../utils/gradeCalc'

type Props = {
  courseId: string | number
}

export const CourseGrades: React.FC<Props> = ({ courseId }) => {
  const queryClient = useQueryClient()
  // Keep raw percent input so users can type decimals naturally
  const [rawWhatIfPct, setRawWhatIfPct] = React.useState<Record<string | number, string>>({})
  const [editingId, setEditingId] = React.useState<string | number | null>(null)
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})
  const { data, isLoading, error, refetch, isFetching } = useCourseGradebook(courseId)
  const groups = data?.groups || []
  const assignments = data?.assignments || []
  const rawAssignments = data?.raw || []

  // Derive numeric point overrides for calculator from percent entries
  const whatIf = React.useMemo(() => {
    const byIdPossible = new Map<string, number>()
    for (const a of rawAssignments) {
      byIdPossible.set(String(a?.id), Number(a?.points_possible ?? 0))
    }
    const out: Record<string | number, number | null> = {}
    for (const [k, v] of Object.entries(rawWhatIfPct)) {
      if (v == null || v.trim() === '') { out[k] = null; continue }
      const pct = parseFloat(v)
      if (!Number.isFinite(pct)) { out[k] = null; continue }
      const possible = byIdPossible.get(String(k)) || 0
      out[k] = possible > 0 ? (pct / 100) * possible : 0
    }
    return out
  }, [rawWhatIfPct, rawAssignments])

  const calc = React.useMemo(() => {
    if (!groups.length) return null as any
    return calculateCourseGrades(groups, assignments, { useWeights: 'auto', treatUngradedAsZero: true, whatIf })
  }, [groups, assignments, whatIf])

  // Toggle: show current vs out-of-total (final) as a single percentage
  const [outOfTotal, setOutOfTotal] = React.useState(false)

  // Global click-away to exit edit mode if clicking outside the active input
  React.useEffect(() => {
    if (editingId == null) return
    const handler = (e: MouseEvent) => {
      const ref = inputRefs.current[String(editingId)]
      if (!ref) { setEditingId(null); return }
      if (e.target instanceof Node) {
        if (!ref.contains(e.target)) {
          setEditingId(null)
        }
      }
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [editingId])

  function onChangeWhatIf(id: string | number, v: string) {
    // Sanitize: allow only digits and a single decimal point
    const sanitized = (() => {
      let s = v.replace(/[^0-9.]/g, '')
      const dot = s.indexOf('.')
      if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '')
      return s
    })()
    setRawWhatIfPct((prev) => ({ ...prev, [id]: sanitized }))
  }

  function clearOverrides() {
    setRawWhatIfPct({})
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="m-0 text-slate-900 dark:text-slate-100 text-base font-semibold">Grades</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                await queryClient.invalidateQueries({ queryKey: ['course-gradebook', courseId] })
              } catch {}
              await refetch()
            }}
          >
            Refresh
          </Button>
          <Button size="sm" variant="ghost" onClick={clearOverrides}>Clear What‑If</Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0 p-4">
        {(isLoading || (isFetching && !data)) && (
          <div className="text-slate-500 dark:text-neutral-400">Loading…</div>
        )}
        {error && <div className="text-red-600">{String(error.message || error)}</div>}

        {calc && (
          <div className="mb-4 flex items-end justify-between">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 px-3 py-2">
                <div className="text-[11px] text-slate-500 dark:text-neutral-400">Current</div>
                <div className="text-xl font-semibold tracking-tight">{calc.current.totals.percent ?? '—'}%</div>
              </div>
              <div className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 px-3 py-2">
                <div className="text-[11px] text-slate-500 dark:text-neutral-400">Final (What‑If)</div>
                <div className="text-xl font-semibold tracking-tight">{calc.final.totals.percent ?? '—'}%</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl md:text-3xl font-semibold tracking-tight">
                {(outOfTotal ? calc.final.totals.percent : calc.current.totals.percent) ?? '—'}%
              </div>
              <label className="mt-2 inline-flex items-center gap-3 select-none">
                <input
                  type="checkbox"
                  checked={outOfTotal}
                  onChange={(e) => setOutOfTotal(e.target.checked)}
                  className="align-middle accent-indigo-600 dark:accent-neutral-300"
                />
                <span className="text-slate-700 dark:text-neutral-200 text-base md:text-lg font-medium">
                  Show final grade
                </span>
              </label>
            </div>
          </div>
        )}

        {rawAssignments.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 dark:border-neutral-800 bg-[var(--app-accent-bg)]/30">
                    <th className="py-2 pr-3 pl-3">Assignment</th>
                    <th className="py-2 pr-3 w-20 text-right">Pts</th>
                    <th className="py-2 pr-3 w-44 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const groupsById = new Map<string, any>(groups.map((g: any) => [String(g.id), g]))
                    const byGroup: Record<string, any[]> = {}
                    for (const a of rawAssignments) {
                      const gid = a?.assignment_group_id != null ? String(a.assignment_group_id) : 'ungrouped'
                      if (!byGroup[gid]) byGroup[gid] = []
                      byGroup[gid].push(a)
                    }
                    const order = Object.keys(byGroup)
                    return order.map((gid) => {
                      const g = groupsById.get(gid)
                      const gName = g?.name || (gid === 'ungrouped' ? 'Ungrouped' : 'Group ' + gid)
                      const weight = g?.groupWeight != null ? Number(g.groupWeight) : null
                      const label = weight && weight > 0 ? `${gName} · ${weight}%` : `${gName}`
                      const list = byGroup[gid]
                      return (
                        <React.Fragment key={gid}>
                          <tr>
                            <td className="pt-4 pb-2 pl-3 text-xs font-semibold text-slate-600 dark:text-neutral-300 uppercase tracking-wide" colSpan={3}>
                              <div className="border-b border-gray-200 dark:border-neutral-800 pb-1">{label}</div>
                            </td>
                          </tr>
                          {list.map((a: any) => {
                            const id = a?.id
                            const pts = a?.points_possible ?? null
                            const score = a?.submission?.excused ? 'Excused' : (a?.submission?.score ?? null)
                            const raw = rawWhatIfPct[id] ?? ''
                            const possible = Number(pts || 0)
                            const apiPct = possible > 0 && typeof score === 'number' ? (score / possible) * 100 : null
                            const showPct = (raw?.trim?.() ? parseFloat(raw) : null) ?? apiPct
                            const display = typeof showPct === 'number' && Number.isFinite(showPct) ? `${Math.round(showPct * 10) / 10}%` : (typeof score === 'string' ? score : '—')
                            return (
                              <tr key={id} className="border-b border-gray-100 dark:border-neutral-800 hover:bg-[var(--app-accent-bg)]/40 transition-colors">
                                <td className="py-2 pr-3 pl-3 max-w-0">
                                  <div className="font-medium truncate" title={a?.name}>{a?.name}</div>
                                  <div className="text-xs text-slate-500 whitespace-nowrap">{a?.due_at ? new Date(a?.due_at).toLocaleString() : 'No due date'}</div>
                                </td>
                                <td className="py-2 pr-3 whitespace-nowrap text-right tabular-nums">{pts ?? '—'}</td>
                                <td className="py-2 pr-3 whitespace-nowrap text-right">
                                  <div className="inline-flex items-center gap-2 justify-end w-full">
                                    {editingId !== id ? (
                                      <>
                                        <span className="tabular-nums">{display}</span>
                                        <button
                                          aria-label="Edit"
                                          className="text-brand hover:text-indigo-600"
                                          onClick={() => {
                                            setRawWhatIfPct((prev) => {
                                              const curr = prev[id]
                                              if ((curr == null || String(curr).trim() === '') && apiPct != null) {
                                                return { ...prev, [id]: String(Math.round(apiPct * 10) / 10) }
                                              }
                                              return prev
                                            })
                                            setEditingId(id)
                                            setTimeout(() => {
                                              const ref = inputRefs.current[String(id)]
                                              ref?.focus()
                                              try {
                                                const val = ref?.value || ''
                                                ref?.setSelectionRange(val.length, val.length)
                                              } catch {}
                                            }, 0)
                                          }}
                                        >
                                          <Pencil className="w-4 h-4" />
                                        </button>
                                        {raw?.trim?.() && (
                                          <button
                                            aria-label="Revert"
                                            className="text-slate-500 hover:text-slate-700"
                                            onClick={() => {
                                              const { [id]: _, ...rest } = rawWhatIfPct as any
                                              setRawWhatIfPct(rest)
                                              if (editingId === id) setEditingId(null)
                                            }}
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <>
                                        <input
                                          type="text"
                                          placeholder={'0'}
                                          value={raw}
                                          onChange={(e) => onChangeWhatIf(id, e.target.value)}
                                          onBlur={() => {
                                            if (!raw || raw.trim() === '') {
                                              setRawWhatIfPct((prev) => ({ ...prev, [id]: '0' }))
                                            }
                                            setEditingId((curr) => (curr === id ? null : curr))
                                          }}
                                          inputMode="decimal"
                                          ref={(el) => { inputRefs.current[String(id)] = el }}
                                          onPaste={(e) => {
                                            e.preventDefault()
                                            const text = (e.clipboardData || (window as any).clipboardData).getData('text') || ''
                                            onChangeWhatIf(id, text)
                                            setTimeout(() => {
                                              const ref = inputRefs.current[String(id)]
                                              const val = ref?.value || ''
                                              try { ref?.setSelectionRange(val.length, val.length) } catch {}
                                            }, 0)
                                          }}
                                          className="mt-0 inline-block w-20 px-2 py-1 border border-gray-300 rounded-control text-sm text-right text-slate-900 placeholder-slate-400 bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none dark:bg-neutral-900 dark:text-slate-100 dark:border-neutral-600 dark:focus:border-brand"
                                        />
                                        <span className="text-slate-500">%</span>
                                        {raw?.trim?.() && (
                                          <button
                                            aria-label="Revert"
                                            className="text-slate-500 hover:text-slate-700"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                              const { [id]: _, ...rest } = rawWhatIfPct as any
                                              setRawWhatIfPct(rest)
                                              setEditingId(null)
                                            }}
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {(() => {
                const groupsById = new Map<string, any>(groups.map((g: any) => [String(g.id), g]))
                const byGroup: Record<string, any[]> = {}
                for (const a of rawAssignments) {
                  const gid = a?.assignment_group_id != null ? String(a.assignment_group_id) : 'ungrouped'
                  if (!byGroup[gid]) byGroup[gid] = []
                  byGroup[gid].push(a)
                }
                const order = Object.keys(byGroup)
                return order.map((gid) => {
                  const g = groupsById.get(gid)
                  const gName = g?.name || (gid === 'ungrouped' ? 'Ungrouped' : 'Group ' + gid)
                  const weight = g?.groupWeight != null ? Number(g.groupWeight) : null
                  const label = weight && weight > 0 ? `${gName} · ${weight}%` : `${gName}`
                  const list = byGroup[gid]
                  return (
                    <div key={gid}>
                      <div className="text-xs font-semibold text-slate-600 dark:text-neutral-300 uppercase tracking-wide mb-2 px-1">{label}</div>
                      <div className="space-y-2">
                        {list.map((a: any) => {
                          const id = a?.id
                          const pts = a?.points_possible ?? null
                          const score = a?.submission?.excused ? 'Excused' : (a?.submission?.score ?? null)
                          const raw = rawWhatIfPct[id] ?? ''
                          const possible = Number(pts || 0)
                          const apiPct = possible > 0 && typeof score === 'number' ? (score / possible) * 100 : null
                          const showPct = (raw?.trim?.() ? parseFloat(raw) : null) ?? apiPct
                          const display = typeof showPct === 'number' && Number.isFinite(showPct) ? `${Math.round(showPct * 10) / 10}%` : (typeof score === 'string' ? score : '—')
                          const isEditing = editingId === id
                          return (
                            <div key={id} className="rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium truncate" title={a?.name}>{a?.name}</div>
                                  <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                                    {a?.due_at ? new Date(a?.due_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'No due date'}
                                    {pts != null && <span className="ml-2">· {pts} pts</span>}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-lg font-semibold tabular-nums">{display}</div>
                                </div>
                              </div>
                              {/* What-If Controls */}
                              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-neutral-800 flex items-center justify-between gap-2">
                                {!isEditing ? (
                                  <>
                                    <span className="text-xs text-slate-500 dark:text-neutral-400">
                                      {raw?.trim?.() ? 'What-If applied' : 'Tap to edit'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        aria-label="Edit"
                                        className="p-1.5 rounded-control ring-1 ring-black/10 dark:ring-white/10 hover:bg-[var(--app-accent-bg)]"
                                        onClick={() => {
                                          setRawWhatIfPct((prev) => {
                                            const curr = prev[id]
                                            if ((curr == null || String(curr).trim() === '') && apiPct != null) {
                                              return { ...prev, [id]: String(Math.round(apiPct * 10) / 10) }
                                            }
                                            return prev
                                          })
                                          setEditingId(id)
                                          setTimeout(() => {
                                            const ref = inputRefs.current[String(id)]
                                            ref?.focus()
                                          }, 0)
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      {raw?.trim?.() && (
                                        <button
                                          aria-label="Revert"
                                          className="p-1.5 rounded-control ring-1 ring-black/10 dark:ring-white/10 hover:bg-[var(--app-accent-bg)]"
                                          onClick={() => {
                                            const { [id]: _, ...rest } = rawWhatIfPct as any
                                            setRawWhatIfPct(rest)
                                          }}
                                        >
                                          <RotateCcw className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 flex-1">
                                      <input
                                        type="text"
                                        placeholder={'0'}
                                        value={raw}
                                        onChange={(e) => onChangeWhatIf(id, e.target.value)}
                                        onBlur={() => {
                                          if (!raw || raw.trim() === '') {
                                            setRawWhatIfPct((prev) => ({ ...prev, [id]: '0' }))
                                          }
                                          setEditingId((curr) => (curr === id ? null : curr))
                                        }}
                                        inputMode="decimal"
                                        ref={(el) => { inputRefs.current[String(id)] = el }}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded-control text-sm text-slate-900 placeholder-slate-400 bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none dark:bg-neutral-900 dark:text-slate-100 dark:border-neutral-600"
                                      />
                                      <span className="text-slate-500 text-sm">%</span>
                                    </div>
                                    {raw?.trim?.() && (
                                      <button
                                        aria-label="Revert"
                                        className="p-1.5 rounded-control ring-1 ring-black/10 dark:ring-white/10 hover:bg-[var(--app-accent-bg)]"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                          const { [id]: _, ...rest } = rawWhatIfPct as any
                                          setRawWhatIfPct(rest)
                                          setEditingId(null)
                                        }}
                                      >
                                        <RotateCcw className="w-4 h-4" />
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
