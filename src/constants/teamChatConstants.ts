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
}

export const DEFAULT_THREAD_KIND: TeamMessageThreadKind = 'everyone'

export function getThreadKindLabel(threadKind: TeamMessageThreadKind): string {
  return THREAD_KIND_LABELS[threadKind]
}
