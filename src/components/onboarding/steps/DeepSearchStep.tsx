import { useEffect, useMemo, useState } from 'react'
import { FileText, FolderOpen, Search } from 'lucide-react'
import type { StepProps } from '../OnboardingWizard'
import { useAppFlags, useAppSettings } from '../../../context/AppContext'
import { Toggle } from '../../settings/SettingsRow'
import { Card } from '../../ui/Card'
import { ListItemRow } from '../../ui/ListItemRow'

type PreviewResult = {
  id: string
  title: string
  source: string
  snippet: string
  icon: 'folder' | 'file'
}

type PreviewStage = {
  id: string
  status: string
  results: PreviewResult[]
}

const TARGET_QUERY = 'where does paris show up in french revolution readings'
const TYPE_INTERVAL_MS = 38

const PREVIEW_STAGES: PreviewStage[] = [
  {
    id: 'scan',
    status: 'Scanning all course content...',
    results: [
      {
        id: 'scan-1',
        title: 'Paris Urban Geography',
        source: 'GEOG 102 · reading_notes.md',
        snippet: '...Paris expanded rapidly during the 1800s with major city redesign projects...',
        icon: 'folder',
      },
      {
        id: 'scan-2',
        title: 'French Vocabulary Drill',
        source: 'FR 101 · practice_sheet.pdf',
        snippet: '...bonjour, capitale, assemblee, citoyen...',
        icon: 'file',
      },
      {
        id: 'scan-3',
        title: 'Week 4 Lecture Notes',
        source: 'HIST 104 · lecture_week4.pdf',
        snippet: '...early political unrest in Paris signaled larger structural tensions...',
        icon: 'folder',
      },
      {
        id: 'scan-4',
        title: 'Enlightenment Thinkers',
        source: 'HIST 104 · module_page',
        snippet: '...ideas circulating in Paris salons influenced later events...',
        icon: 'file',
      },
    ],
  },
  {
    id: 'mentions',
    status: 'Filtering for Paris references...',
    results: [
      {
        id: 'mentions-1',
        title: 'Week 4 Lecture Notes',
        source: 'HIST 104 · lecture_week4.pdf',
        snippet: '...Paris became the center for revolutionary organizing in 1789...',
        icon: 'folder',
      },
      {
        id: 'mentions-2',
        title: 'Chapter 8 Discussion Prompt',
        source: 'HIST 104 · Modules',
        snippet: '...compare how Paris influenced political movements during 1789...',
        icon: 'file',
      },
      {
        id: 'mentions-3',
        title: 'Essay Draft Feedback',
        source: 'HIST 104 · Feedback',
        snippet: '...your section on Paris is strong, but connect it to later reforms...',
        icon: 'file',
      },
      {
        id: 'mentions-4',
        title: 'Paris Urban Geography',
        source: 'GEOG 102 · reading_notes.md',
        snippet: '...Paris expanded rapidly during the 1800s with major city redesign projects...',
        icon: 'folder',
      },
    ],
  },
  {
    id: 'context',
    status: 'Matching French Revolution context...',
    results: [
      {
        id: 'context-1',
        title: 'French Revolution Lecture Notes',
        source: 'HIST 104 · lecture_week4.pdf',
        snippet: '...Paris is the capital of France and became a center of revolutionary politics...',
        icon: 'folder',
      },
      {
        id: 'context-2',
        title: 'Chapter 8 Discussion Prompt',
        source: 'HIST 104 · Modules',
        snippet: '...compare how Paris influenced political movements during 1789...',
        icon: 'file',
      },
      {
        id: 'context-3',
        title: 'Week 5 Seminar Notes',
        source: 'HIST 104 · seminar_notes.md',
        snippet: '...students in Paris organized local clubs that shaped public opinion...',
        icon: 'folder',
      },
      {
        id: 'context-4',
        title: 'Essay Draft Feedback',
        source: 'HIST 104 · Feedback',
        snippet: '...your section on Paris is strong, but connect it to later reforms...',
        icon: 'file',
      },
    ],
  },
  {
    id: 'final',
    status: 'Best matches ready',
    results: [
      {
        id: 'final-1',
        title: 'French Revolution Lecture Notes',
        source: 'HIST 104 · lecture_week4.pdf',
        snippet: '...Paris is the capital of France and became a center of revolutionary politics...',
        icon: 'folder',
      },
      {
        id: 'final-2',
        title: 'Week 5 Seminar Notes',
        source: 'HIST 104 · seminar_notes.md',
        snippet: '...students in Paris organized local clubs that shaped public opinion...',
        icon: 'folder',
      },
      {
        id: 'final-3',
        title: 'Chapter 8 Discussion Prompt',
        source: 'HIST 104 · Modules',
        snippet: '...compare how Paris influenced political movements during 1789...',
        icon: 'file',
      },
      {
        id: 'final-4',
        title: 'Essay Draft Feedback',
        source: 'HIST 104 · Feedback',
        snippet: '...your section on Paris is strong, but connect it to later reforms...',
        icon: 'file',
      },
    ],
  },
]

function getStageIndex(typedLength: number) {
  if (typedLength < 14) return 0
  if (typedLength < 30) return 1
  if (typedLength < 45) return 2
  return 3
}

export function DeepSearchStep(_props: StepProps) {
  const { embeddingsEnabled, privateModeEnabled } = useAppFlags()
  const { setEmbeddingsEnabled } = useAppSettings()
  const [typedLength, setTypedLength] = useState(0)

  useEffect(() => {
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null
    let cancelled = false
    let currentLength = 0

    setTypedLength(0)
    currentLength = 0

    const typeNext = () => {
      if (cancelled) return
      currentLength = Math.min(TARGET_QUERY.length, currentLength + 1)
      setTypedLength(currentLength)
      if (currentLength < TARGET_QUERY.length) {
        timeoutHandle = setTimeout(typeNext, TYPE_INTERVAL_MS)
      }
    }

    timeoutHandle = setTimeout(typeNext, 260)

    return () => {
      cancelled = true
      if (timeoutHandle) clearTimeout(timeoutHandle)
    }
  }, [])

  const typedQuery = TARGET_QUERY.slice(0, typedLength)
  const stageIndex = useMemo(() => getStageIndex(typedLength), [typedLength])
  const activeStage = PREVIEW_STAGES[stageIndex]
  const isTyping = typedLength < TARGET_QUERY.length

  return (
    <div className="flex-1 flex flex-col px-6 py-8 md:px-10 md:py-10">
      <div className="max-w-4xl mx-auto w-full grid gap-5 md:grid-cols-2 items-start">
        <div className="animate-oobe-fade-up-1">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Deep Search
          </h2>
          <p className="mt-2 text-sm md:text-base text-slate-500 dark:text-neutral-400">
            Ask a question and jump to the exact passages that answer it.
          </p>

          <div className="mt-5 border-y border-gray-200/70 dark:border-neutral-700/70 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                  Enable Deep Search
                </p>
                <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
                  Indexes course content locally to find meaning, not just keywords.
                </p>
              </div>
              <Toggle
                checked={embeddingsEnabled}
                onChange={(checked) => setEmbeddingsEnabled(checked).catch(() => {})}
                disabled={privateModeEnabled}
              />
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-neutral-400">
              {privateModeEnabled
                ? 'Unavailable in Private Mode.'
                : 'Everything stays on your device.'}
            </p>
          </div>
        </div>

        <Card className="animate-oobe-fade-up-2 p-3.5">
          <div className="rounded-xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-neutral-900">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                readOnly
                value={`${typedQuery}${isTyping && typedLength > 0 ? '|' : ''}`}
                placeholder="Ask a question about your course content..."
                className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-neutral-500 text-base outline-none"
              />
            </div>
            <p className="px-4 py-2 text-xs text-slate-500 dark:text-neutral-400 border-b border-gray-200/70 dark:border-neutral-800/80">
              {activeStage.status}
            </p>
          </div>

          <div key={activeStage.id} className="space-y-1.5 mt-2.5 animate-oobe-fade-up">
            {activeStage.results.map((result, index) => (
              <ListItemRow
                key={result.id}
                density="compact"
                className="cursor-default"
                active={activeStage.id === 'final' && index === 0}
                icon={
                  result.icon === 'folder' ? (
                    <FolderOpen className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )
                }
                title={result.title}
                subtitle={
                  <span className="block min-w-0">
                    <span className="block truncate">{result.source}</span>
                    <span className="block truncate text-slate-500 dark:text-neutral-400">
                      {result.snippet}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
