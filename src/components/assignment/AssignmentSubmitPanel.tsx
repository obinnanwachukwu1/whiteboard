import React from 'react'
import { ExternalLink, Link2, Loader2, Type, UploadCloud, X, File, CheckCircle2, Clock } from 'lucide-react'
import type { AssignmentRestDetail, SubmissionDetail } from '../../types/canvas'
import { Button } from '../ui/Button'
import { useSubmitAssignment, useSubmitAssignmentUpload } from '../../hooks/useCanvasMutations'

type PickedFile = { path: string; name: string; size: number }

type Props = {
  courseId: string | number
  assignmentRestId: string | number
  assignment: AssignmentRestDetail
  submission?: SubmissionDetail | null
}

export const AssignmentSubmitPanel: React.FC<Props> = ({ courseId, assignmentRestId, assignment, submission }) => {
  const submissionTypes = Array.isArray(assignment.submission_types) ? assignment.submission_types : []
  const supportsUpload = submissionTypes.includes('online_upload')
  const supportsText = submissionTypes.includes('online_text_entry')
  const supportsUrl = submissionTypes.includes('online_url')
  const isExternalTool = submissionTypes.includes('external_tool')

  const locked = !!assignment.locked_for_user

  const submitText = useSubmitAssignment()
  const submitUpload = useSubmitAssignmentUpload()

  const [mode, setMode] = React.useState<'upload' | 'text' | 'url'>(() => {
    if (supportsUpload) return 'upload'
    if (supportsText) return 'text'
    return 'url'
  })
  
  React.useEffect(() => {
    if (!supportsUpload && !supportsText && !supportsUrl) return

    let nextMode = mode
    if (mode === 'upload' && !supportsUpload) nextMode = supportsText ? 'text' : 'url'
    else if (mode === 'text' && !supportsText) nextMode = supportsUpload ? 'upload' : 'url'
    else if (mode === 'url' && !supportsUrl) nextMode = supportsUpload ? 'upload' : 'text'

    if (nextMode !== mode) setMode(nextMode)
  }, [mode, supportsUpload, supportsText, supportsUrl])

  const [picked, setPicked] = React.useState<PickedFile[]>([])
  const [textBody, setTextBody] = React.useState('')
  const [urlValue, setUrlValue] = React.useState('')
  const [err, setErr] = React.useState<string | null>(null)
  const [attempting, setAttempting] = React.useState(false)

  const busy = submitText.isPending || submitUpload.isPending
  const canSubmitInApp = supportsUpload || supportsText || supportsUrl

  // Parse allowed extensions for display and filtering
  const allowedExtensions = React.useMemo(() => {
    if (!assignment.allowed_extensions) return []
    return assignment.allowed_extensions.map(e => e.trim().toLowerCase().replace(/^\./, '')).filter(Boolean)
  }, [assignment.allowed_extensions])

  // Get latest comment
  const latestSubmissionComment = React.useMemo(() => {
    const list = submission?.submission_comments
    if (!Array.isArray(list) || !list.length) return null
    const sorted = list.slice().sort((a, b) => {
      const at = a?.created_at ? new Date(a.created_at).getTime() : 0
      const bt = b?.created_at ? new Date(b.created_at).getTime() : 0
      return bt - at
    })
    return sorted[0] || null
  }, [submission])

  const hasSubmission = React.useMemo(() => {
    if (!submission) return false
    if (submission.excused) return true
    if (submission.submitted_at) return true
    if (submission.graded_at) return true
    if (submission.score != null) return true
    if (submission.grade != null && String(submission.grade).trim() !== '') return true
    if (submission.workflow_state && submission.workflow_state !== 'unsubmitted') return true
    return false
  }, [submission])

  const openExternalPortal = async () => {
    const target = assignment.html_url || assignment.external_tool_tag_attributes?.url
    if (!target) return
    try {
      await window.system.openExternal(target)
    } catch {}
  }

  const pickFiles = async () => {
    setErr(null)
    try {
      // Create filter from allowed extensions
      const filters = allowedExtensions.length > 0 
        ? [{ name: 'Allowed Extensions', extensions: allowedExtensions }] 
        : undefined
      
      const res = await window.system.pickFiles({ multiple: true, filters })
      if (!res?.ok) {
        setErr(res?.error || 'Failed to pick files')
        return
      }
      const next = (res.data || []) as PickedFile[]
      if (next.length) setPicked(next)
    } catch (e: any) {
      setErr(String(e?.message || e))
    }
  }

  const doSubmit = async () => {
    setErr(null)
    try {
      if (locked) {
        setErr(assignment.lock_explanation || 'This assignment is locked.')
        return
      }

      if (mode === 'upload') {
        if (!picked.length) {
          setErr('Pick at least one file to upload.')
          return
        }
        
        await submitUpload.mutateAsync({ 
          courseId, 
          assignmentRestId, 
          filePaths: picked.map((p) => p.path),
          allowedExtensions: allowedExtensions.length > 0 ? allowedExtensions : undefined
        })
        setPicked([])
        setAttempting(false)
        return
      }

      if (mode === 'text') {
        if (!textBody.trim()) {
          setErr('Enter some text to submit.')
          return
        }
        await submitText.mutateAsync({ courseId, assignmentRestId, submissionType: 'online_text_entry', body: textBody })
        setTextBody('')
        setAttempting(false)
        return
      }

      if (mode === 'url') {
        const v = urlValue.trim()
        if (!v) {
          setErr('Enter a URL to submit.')
          return
        }
        try {
          const u = new URL(v)
          if (u.protocol !== 'http:' && u.protocol !== 'https:') {
            setErr('URL must start with http(s).')
            return
          }
        } catch {
          setErr('Invalid URL.')
          return
        }
        await submitText.mutateAsync({ courseId, assignmentRestId, submissionType: 'online_url', url: v })
        setUrlValue('')
        setAttempting(false)
      }
    } catch (e: any) {
      setErr(String(e?.message || e))
    }
  }

  const renderSubmissionStatus = () => {
    if (!hasSubmission) return null

    const score = submission?.score
    const gradedAt = submission?.graded_at
    const excused = submission?.excused
    const submittedAt = submission?.submitted_at
    const pts = assignment.points_possible

    return (
      <div className="mb-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 overflow-hidden">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${score != null ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}>
                {score != null ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  {excused ? 'Excused' : (score != null ? 'Graded' : 'Submitted')}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {gradedAt 
                    ? `Graded ${new Date(gradedAt).toLocaleDateString()}` 
                    : (submittedAt ? `Submitted ${new Date(submittedAt).toLocaleDateString()}` : 'No date')}
                </div>
              </div>
            </div>
            
            {score != null && (
              <div className="text-right">
                <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                  {score}
                  {typeof pts === 'number' && <span className="text-sm text-neutral-500 font-normal ml-0.5">/{pts}</span>}
                </div>
              </div>
            )}
          </div>

          {latestSubmissionComment?.comment && (
            <div className="mt-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {latestSubmissionComment.author_name || 'Instructor Feedback'}
                </span>
                <span className="text-[10px] text-neutral-400">
                  {latestSubmissionComment.created_at && new Date(latestSubmissionComment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {latestSubmissionComment.comment}
              </p>
            </div>
          )}
        </div>
        
        {/* New Attempt Action - Only show if not locked */}
        {!locked && !attempting && (
          <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-3 flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setAttempting(true)}>
              New Attempt
            </Button>
          </div>
        )}
      </div>
    )
  }

  if (!canSubmitInApp && isExternalTool) {
    return (
      <div className="mb-8">
        {renderSubmissionStatus()}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 p-6 text-center">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">External Submission</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-sm mx-auto">
            This assignment requires submission via an external tool.
          </p>
          <Button size="sm" variant="ghost" onClick={openExternalPortal} className="gap-2 border border-neutral-200 dark:border-neutral-700">
            <ExternalLink className="w-4 h-4" />
            Launch External Tool
          </Button>
        </div>
      </div>
    )
  }

  if (!canSubmitInApp) return null

  // If already submitted and not attempting a new one, just show status
  if (hasSubmission && !attempting) {
    return (
      <div className="mb-8">
        {renderSubmissionStatus()}
      </div>
    )
  }

  return (
    <div className="mb-8">
      {hasSubmission && (
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">New Attempt</h3>
          <Button size="sm" variant="ghost" onClick={() => setAttempting(false)} className="text-xs h-7">
            Cancel
          </Button>
        </div>
      )}
      
      {/* Simplified Tabs */}
      <div className="flex gap-6 border-b border-neutral-200 dark:border-neutral-800 mb-6">
        {supportsUpload && (
          <button
            onClick={() => setMode('upload')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              mode === 'upload' 
                ? 'text-neutral-900 dark:text-neutral-100' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            File Upload
            {mode === 'upload' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-neutral-100 rounded-t-full" />
            )}
          </button>
        )}
        {supportsText && (
          <button
            onClick={() => setMode('text')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              mode === 'text' 
                ? 'text-neutral-900 dark:text-neutral-100' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Text Entry
            {mode === 'text' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-neutral-100 rounded-t-full" />
            )}
          </button>
        )}
        {supportsUrl && (
          <button
            onClick={() => setMode('url')}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              mode === 'url' 
                ? 'text-neutral-900 dark:text-neutral-100' 
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
            }`}
          >
            Website URL
            {mode === 'url' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 dark:bg-neutral-100 rounded-t-full" />
            )}
          </button>
        )}
      </div>

      <div className="min-h-[200px]">
        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-4">
            <div 
              onClick={() => !locked && !busy && pickFiles()}
              className={`
                group relative border border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                ${locked || busy ? 'opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-800' : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}
              `}
            >
              <div className="w-10 h-10 mx-auto rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Click to select files
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {allowedExtensions.length > 0 
                  ? `Allowed: ${allowedExtensions.join(', ')}`
                  : 'All file types accepted'
                }
              </p>
            </div>

            {picked.length > 0 && (
              <div className="space-y-2">
                {picked.map((f) => (
                  <div key={f.path} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <File className="w-4 h-4 text-neutral-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{f.name}</div>
                        <div className="text-xs text-neutral-500">{Math.round(f.size / 1024)} KB</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setPicked((prev) => prev.filter((x) => x.path !== f.path))}
                      className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-md transition-colors"
                      disabled={busy}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text Mode */}
        {mode === 'text' && (
          <div className="space-y-3">
            <textarea
              value={textBody}
              onChange={(e) => setTextBody(e.target.value)}
              placeholder="Type your submission here..."
              className="w-full min-h-[200px] p-4 text-sm rounded-xl border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-all resize-y"
              disabled={busy || locked}
            />
          </div>
        )}

        {/* URL Mode */}
        {mode === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Website URL</label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://example.com/project"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-800 bg-transparent text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-neutral-100 transition-all"
                  disabled={busy || locked}
                />
              </div>
            </div>
          </div>
        )}

        {err && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
            {err}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={doSubmit}
            disabled={busy || locked || (mode === 'upload' && !picked.length) || (mode === 'text' && !textBody.trim()) || (mode === 'url' && !urlValue.trim())}
            className="w-full sm:w-auto min-w-[120px]"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {locked ? 'Assignment Locked' : hasSubmission ? 'Re-submit Assignment' : 'Submit Assignment'}
          </Button>
        </div>
      </div>
    </div>
  )
}