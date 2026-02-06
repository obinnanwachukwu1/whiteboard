import { useEffect, useState } from 'react'
import { ArrowUp, Sparkles } from 'lucide-react'
import type { StepProps } from '../OnboardingWizard'
import { useAppFlags, useAppSettings } from '../../../context/AppContext'
import { Toggle } from '../../settings/SettingsRow'
import { Card } from '../../ui/Card'
import { MarkdownMessage } from '../../AISidePanel/MarkdownMessage'

const STREAMED_RESPONSE = `Great question. Here is a focused plan for tonight:

1. **Biology Lab Report** (45 minutes)
- Finish methods and conclusion.
- Do one proofreading pass and submit before 11:59 PM.

2. **CS Project Draft** (30 minutes)
- Write the intro and core approach section.
- Add a short checklist for what is still missing.

3. **Quick Wrap-Up** (10 minutes)
- Check tomorrow's deadlines.
- Set one reminder for your highest-priority task.`

export function AIStep(_props: StepProps) {
  const { aiEnabled, embeddingsEnabled, aiAvailability, privateModeEnabled } = useAppFlags()
  const { setAiEnabled } = useAppSettings()
  const [showUserMessage, setShowUserMessage] = useState(false)
  const [assistantText, setAssistantText] = useState('')
  const [assistantStreaming, setAssistantStreaming] = useState(false)

  const aiAvailabilityStatus = aiAvailability?.status
  const aiDisabledBySystem = aiAvailabilityStatus === 'disabled'
  const aiDisabledByError = aiAvailabilityStatus === 'error'
  const aiDisabled = privateModeEnabled || !embeddingsEnabled || aiDisabledBySystem || aiDisabledByError
  const aiToggleChecked = aiDisabledBySystem || aiDisabledByError ? false : aiEnabled

  const disabledReason = (() => {
    if (privateModeEnabled) return 'Unavailable in Private Mode.'
    if (!embeddingsEnabled) return 'Enable Deep Search first.'
    if (aiDisabledBySystem) return 'Enable in System Settings.'
    if (aiDisabledByError) return 'Availability could not be verified.'
    return ''
  })()

  useEffect(() => {
    setShowUserMessage(false)
    setAssistantText('')
    setAssistantStreaming(false)

    const timeoutHandles: Array<ReturnType<typeof setTimeout>> = []
    let streamHandle: ReturnType<typeof setInterval> | null = null

    timeoutHandles.push(
      setTimeout(() => {
        setShowUserMessage(true)
      }, 450),
    )

    timeoutHandles.push(
      setTimeout(() => {
        setAssistantStreaming(true)
        const chunks = STREAMED_RESPONSE.split(/(\s+)/)
        let idx = 0
        streamHandle = setInterval(() => {
          idx = Math.min(chunks.length, idx + 1)
          setAssistantText(chunks.slice(0, idx).join(''))
          if (idx >= chunks.length) {
            if (streamHandle) clearInterval(streamHandle)
            setAssistantStreaming(false)
          }
        }, 28)
      }, 950),
    )

    return () => {
      timeoutHandles.forEach((handle) => clearTimeout(handle))
      if (streamHandle) clearInterval(streamHandle)
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col px-6 py-8 md:px-10 md:py-10">
      <div className="max-w-4xl mx-auto w-full grid gap-5 md:grid-cols-2 items-start">
        <div className="animate-oobe-fade-up-1">
          <h2 className="text-2xl md:text-3xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
            Whiteboard AI
          </h2>
          <div className="mt-5 border-y border-gray-200/70 dark:border-neutral-700/70 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-medium text-slate-900 dark:text-slate-100">
                  Enable Whiteboard AI
                </p>
                <p className="text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
                  Ask questions, summarize course content, and get assignment help.
                </p>
              </div>
              <Toggle
                checked={aiToggleChecked}
                onChange={(checked) => setAiEnabled(checked).catch(() => {})}
                disabled={aiDisabled}
              />
            </div>

            {disabledReason && (
              <p className="mt-3 text-xs text-slate-500 dark:text-neutral-400">{disabledReason}</p>
            )}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-slate-400 dark:text-neutral-500">
            Whiteboard AI is powered by Apple Intelligence, a trademark of Apple Inc.
          </p>
        </div>

        <Card className={`animate-oobe-fade-up-2 p-0 h-[460px] md:h-[520px] ${aiDisabled ? 'opacity-60' : ''}`}>
          <div className="h-full rounded-xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10 bg-white dark:bg-neutral-900 flex flex-col">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-200/50 dark:border-neutral-700/50">
              <span
                className="w-7 h-7 rounded-full inline-flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-100)' }}
              >
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-600)' }} />
              </span>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Whiteboard AI</p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
              {!showUserMessage && !assistantText && (
                <div className="py-6 text-center animate-oobe-fade-up">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Start a conversation to get help with your courses.
                  </p>
                </div>
              )}

              {showUserMessage && (
                <div className="flex justify-end animate-oobe-fade-up-1">
                  <div className="max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed text-white ml-8 bg-[color:var(--accent-primary)]">
                    What should I focus on tonight across Biology and CS?
                  </div>
                </div>
              )}

              {(assistantText || assistantStreaming) && (
                <div className="flex justify-start animate-oobe-fade-up-2">
                  <div className="flex-1 pl-2 text-sm leading-relaxed text-gray-900 dark:text-gray-100 mr-8">
                    {assistantStreaming && !assistantText && (
                      <span className="text-gray-400 dark:text-gray-500">Thinking...</span>
                    )}
                    {assistantText && (
                      <div>
                        <MarkdownMessage
                          markdown={assistantText}
                          streaming={assistantStreaming}
                          buffered={false}
                          className="ai-markdown"
                        />
                        {assistantStreaming && (
                          <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-slate-400/70 dark:bg-neutral-500/70 animate-pulse" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200/50 dark:border-neutral-700/50">
              <div className="flex items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    readOnly
                    value=""
                    placeholder="Demo conversation"
                    className="w-full pr-10 pl-3 py-2 text-sm bg-gray-100 dark:bg-neutral-800 border border-gray-200/70 dark:border-neutral-700/70 rounded-lg outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-md bg-[color:var(--accent-600)] text-white">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
