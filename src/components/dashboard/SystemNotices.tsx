import React from 'react'
import { AlertCircle, AlertTriangle, Calendar, Check, HelpCircle, Info } from 'lucide-react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { HtmlContent } from '../HtmlContent'
import { formatDateTime } from '../../utils/dateFormat'
import type { AccountNotification } from '../../types/canvas'

type Props = {
  items: AccountNotification[]
  onMarkRead: (id: string | number) => void
  maxVisible?: number
  canMarkRead?: boolean
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  information: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  question: HelpCircle,
  calendar: Calendar,
}

function getIcon(icon?: string) {
  if (!icon) return Info
  const key = String(icon).toLowerCase()
  return ICONS[key] || Info
}

function formatWindow(start?: string | null, end?: string | null) {
  const startLabel = formatDateTime(start)
  const endLabel = formatDateTime(end)
  const hasStart = startLabel !== '—'
  const hasEnd = endLabel !== '—'
  if (hasStart && hasEnd) return `${startLabel} – ${endLabel}`
  if (hasStart) return `Starts ${startLabel}`
  if (hasEnd) return `Ends ${endLabel}`
  return null
}

export const SystemNotices: React.FC<Props> = ({
  items,
  onMarkRead,
  maxVisible = 3,
  canMarkRead = true,
}) => {
  const [expanded, setExpanded] = React.useState(false)
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set())
  const visibleItems = expanded ? items : items.slice(0, Math.max(1, maxVisible))
  const hiddenCount = Math.max(0, items.length - visibleItems.length)

  if (items.length === 0) return null

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 m-0">
          System Messages
        </h2>
        <div className="flex items-center gap-2">
          {items.length > 1 && <Badge tone="brand">{items.length}</Badge>}
          {hiddenCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(true)}
            >
              Show all ({hiddenCount})
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {visibleItems.map((item) => {
          const Icon = getIcon(item.icon)
          const windowLabel = formatWindow(item.start_at, item.end_at)
          const id = String(item.id)
          const isExpanded = expandedIds.has(id)
          const toggleExpanded = () => {
            setExpandedIds((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })
          }
          return (
            <div
              key={id}
              className="rounded-lg ring-1 ring-gray-200/80 dark:ring-neutral-800 bg-white/70 dark:bg-neutral-900/70 p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full ring-1 ring-black/10 dark:ring-white/10 flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--app-accent-bg)' }}
                >
                  <Icon className="w-5 h-5 text-[var(--app-accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.subject || 'System message'}
                      </div>
                      {windowLabel && (
                        <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                          {windowLabel}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      title="Mark as read"
                      aria-label="Mark as read"
                      disabled={!canMarkRead}
                      onClick={() => onMarkRead(item.id)}
                      className={`p-1.5 rounded
                        text-slate-400 hover:text-[var(--app-accent)] dark:text-neutral-500
                        hover:bg-[var(--app-accent-bg)] transition-all
                        ${canMarkRead ? '' : 'opacity-60 cursor-not-allowed hover:bg-transparent'}`}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>

                  {item.message && (
                    <div className="mt-3">
                      <HtmlContent
                        html={item.message}
                        className={`rich-html system-notice-html ${isExpanded ? '' : 'system-notice-clamp'}`}
                      />
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={toggleExpanded}
                        >
                          {isExpanded ? 'Show less' : 'Show more'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
