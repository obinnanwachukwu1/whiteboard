import type { Conversation } from '../../types/canvas'

export function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function getParticipantNames(
  conversation: Conversation,
  excludeSelf?: string | number,
): string {
  const participants = conversation.participants || []
  const others = excludeSelf
    ? participants.filter((p) => String(p.id) !== String(excludeSelf))
    : participants
  if (others.length === 0) return participants[0]?.name || 'Unknown'
  if (others.length === 1) return others[0].name || 'Unknown'
  if (others.length === 2) return `${others[0].name}, ${others[1].name}`
  return `${others[0].name} +${others.length - 1}`
}
