import { memo } from 'react'
import { Paperclip, X } from 'lucide-react'

type Props = {
  offerLabel: string
  offerDisabled: boolean
  draftTitle?: string | null
  draftSubtitle?: string | null
  onOfferClick: () => void
  onCancelDraft: () => void
}

export const AISidePanelContextBar = memo(function AISidePanelContextBar({
  offerLabel,
  offerDisabled,
  draftTitle,
  draftSubtitle,
  onOfferClick,
  onCancelDraft,
}: Props) {
  return (
    <div className="px-4 pt-3 pb-1.5 border-t border-gray-200/50 dark:border-neutral-700/50">
      <div className="flex items-center justify-between gap-2">
        {!draftTitle ? (
          <button
            type="button"
            disabled={offerDisabled}
            onClick={onOfferClick}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200/70 dark:hover:bg-neutral-700/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Paperclip className="w-3 h-3" />
            <span className="whitespace-nowrap">{offerLabel}</span>
          </button>
        ) : (
          <DraftPill
            title={draftTitle}
            subtitle={draftSubtitle || undefined}
            onCancel={onCancelDraft}
          />
        )}
        <div className="flex-1" />
      </div>
    </div>
  )
})

const DraftPill = memo(function DraftPill({
  title,
  subtitle,
  onCancel,
}: {
  title: string
  subtitle?: string
  onCancel: () => void
}) {
  return (
    <div className="inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded-md bg-[color:var(--accent-100)] dark:bg-[color:var(--accent-50)] ring-1 ring-[color:var(--accent-200)] dark:ring-[color:var(--accent-200)]">
      <div className="min-w-0">
        <div className="text-[10px] leading-tight text-[color:var(--accent-800)] dark:text-[color:var(--accent-900)] truncate">
          Will attach: {title}
        </div>
        {subtitle && (
          <div className="text-[9px] leading-tight text-[color:var(--accent-700)] dark:text-[color:var(--accent-800)] truncate opacity-80">
            {subtitle}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 dark:hover:bg-black/10 transition-colors"
        aria-label="Cancel attach"
        title="Cancel"
      >
        <X className="w-3 h-3 text-[color:var(--accent-800)] dark:text-[color:var(--accent-900)] opacity-80" />
      </button>
    </div>
  )
})
