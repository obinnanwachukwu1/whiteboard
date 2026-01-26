import React from 'react'
import { ExternalLink, Link2, Loader2, Type, UploadCloud, X } from 'lucide-react'
import type { AssignmentRestDetail } from '../../types/canvas'
import { Button } from '../ui/Button'
import { useSubmitAssignment, useSubmitAssignmentUpload } from '../../hooks/useCanvasMutations'

type PickedFile = { path: string; name: string; size: number }

type Props = {
  courseId: string | number
  assignmentRestId: string | number
  assignment: AssignmentRestDetail
}

export const AssignmentSubmitPanel: React.FC<Props> = ({ courseId, assignmentRestId, assignment }) => {
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
    // Keep mode valid if assignment types change
    if (mode === 'upload' && !supportsUpload) setMode(supportsText ? 'text' : 'url')
    if (mode === 'text' && !supportsText) setMode(supportsUpload ? 'upload' : 'url')
    if (mode === 'url' && !supportsUrl) setMode(supportsUpload ? 'upload' : 'text')
  }, [mode, supportsUpload, supportsText, supportsUrl])

  const [picked, setPicked] = React.useState<PickedFile[]>([])
  const [textBody, setTextBody] = React.useState('')
  const [urlValue, setUrlValue] = React.useState('')
  const [err, setErr] = React.useState<string | null>(null)

  const busy = submitText.isPending || submitUpload.isPending

  const canSubmitInApp = supportsUpload || supportsText || supportsUrl

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
      const res = await window.system.pickFiles({ multiple: true })
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
        await submitUpload.mutateAsync({ courseId, assignmentRestId, filePaths: picked.map((p) => p.path) })
        setPicked([])
        return
      }

      if (mode === 'text') {
        if (!textBody.trim()) {
          setErr('Enter some text to submit.')
          return
        }
        await submitText.mutateAsync({ courseId, assignmentRestId, submissionType: 'online_text_entry', body: textBody })
        setTextBody('')
        return
      }

      if (mode === 'url') {
        const v = urlValue.trim()
        if (!v) {
          setErr('Enter a URL to submit.')
          return
        }
        // Basic validation: only allow http(s)
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
      }
    } catch (e: any) {
      setErr(String(e?.message || e))
    }
  }

  // External-only assignments: send out to Canvas.
  if (!canSubmitInApp && isExternalTool) {
    return (
      <div className="mb-5 rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Submission</div>
            <div className="mt-1 text-sm text-slate-600 dark:text-neutral-300">
              This assignment uses an external submission portal.
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={openExternalPortal}>
            <ExternalLink className="w-4 h-4" />
            Open portal
          </Button>
        </div>
      </div>
    )
  }

  if (!canSubmitInApp) return null

  return (
    <div className="mb-5 rounded-card ring-1 ring-gray-200 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Submit</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
            {locked ? (assignment.lock_explanation || 'This assignment is locked.') : 'Submit directly to Canvas'}
          </div>
        </div>
        {isExternalTool && (
          <Button size="sm" variant="ghost" onClick={openExternalPortal}>
            <ExternalLink className="w-4 h-4" />
            Open portal
          </Button>
        )}
      </div>

      {/* Mode selector */}
      <div className="mt-3 inline-flex rounded-control ring-1 ring-black/10 dark:ring-white/10 overflow-hidden">
        {supportsUpload && (
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-3 py-1.5 text-xs sm:text-sm inline-flex items-center gap-2 ${mode === 'upload' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white/80 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60'}`}
          >
            <UploadCloud className="w-4 h-4" /> Upload
          </button>
        )}
        {supportsText && (
          <button
            type="button"
            onClick={() => setMode('text')}
            className={`px-3 py-1.5 text-xs sm:text-sm inline-flex items-center gap-2 ${mode === 'text' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white/80 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60'}`}
          >
            <Type className="w-4 h-4" /> Text
          </button>
        )}
        {supportsUrl && (
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`px-3 py-1.5 text-xs sm:text-sm inline-flex items-center gap-2 ${mode === 'url' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-white/80 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 hover:bg-slate-100/70 dark:hover:bg-neutral-800/60'}`}
          >
            <Link2 className="w-4 h-4" /> URL
          </button>
        )}
      </div>

      {/* Inputs */}
      {mode === 'upload' && (
        <div className="mt-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={pickFiles} disabled={busy || locked}>
              Choose files
            </Button>
            <div className="text-xs text-slate-500 dark:text-neutral-400">
              {picked.length ? `${picked.length} selected` : 'No files selected'}
            </div>
          </div>
          {picked.length > 0 && (
            <div className="mt-2 space-y-1">
              {picked.map((f) => (
                <div key={f.path} className="flex items-center justify-between gap-2 text-sm rounded-md bg-slate-50 dark:bg-neutral-800/50 px-2 py-1">
                  <div className="min-w-0 truncate">{f.name}</div>
                  <button
                    type="button"
                    className="p-1 rounded-md text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                    onClick={() => setPicked((prev) => prev.filter((x) => x.path !== f.path))}
                    aria-label="Remove file"
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

      {mode === 'text' && (
        <div className="mt-3">
          <textarea
            value={textBody}
            onChange={(e) => setTextBody(e.target.value)}
            placeholder="Write your submission..."
            className="w-full min-h-[120px] resize-y rounded-card border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand/30"
            disabled={busy || locked}
          />
        </div>
      )}

      {mode === 'url' && (
        <div className="mt-3">
          <input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-control border border-gray-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand/30"
            disabled={busy || locked}
          />
        </div>
      )}

      {err && (
        <div className="mt-3 text-sm text-red-600">{err}</div>
      )}

      <div className="mt-4 flex items-center justify-end">
        <Button
          size="sm"
          onClick={doSubmit}
          disabled={busy || locked}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Submit
        </Button>
      </div>
    </div>
  )
}
