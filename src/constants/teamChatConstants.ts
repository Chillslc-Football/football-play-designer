import type { TeamMessageThreadKind } from '../types/teamMessage'

export const BUILTIN_CHANNEL_ORDER: TeamMessageThreadKind[] = [
  'everyone',
  'coaches',
  'players',
  'parents',
]

export const THREAD_KIND_LABELS: Record<TeamMessageThreadKind, string> = {
  everyone: 'Everyone',
  coaches: 'Coaches',
  players: 'Players',
  parents: 'Parents',
  direct: 'Direct Message',
}

export const DEFAULT_THREAD_KIND: TeamMessageThreadKind = 'everyone'

export function getThreadKindLabel(threadKind: TeamMessageThreadKind): string {
  return THREAD_KIND_LABELS[threadKind]
}

export function getConversationTitle(input: {
  thread_kind: TeamMessageThreadKind
  title: string
}): string {
  if (input.thread_kind === 'direct') {
    return input.title.trim() || THREAD_KIND_LABELS.direct
  }

  return getThreadKindLabel(input.thread_kind)
}
