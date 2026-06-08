import type { PlayerLabel } from './player'

/** Every offensive position that can have assignment notes. */
export const ALL_PLAYER_LABELS: PlayerLabel[] = [
  'QB',
  'RB',
  'FB',
  'X',
  'Y',
  'Z',
  'LT',
  'LG',
  'C',
  'RG',
  'RT',
]

/** Assignment notes keyed by player id (QB, RB, X, etc.). */
export type PlayerNotes = Record<PlayerLabel, string>

/** Creates an empty notes entry for every player. */
export function createEmptyPlayerNotes(): PlayerNotes {
  return Object.fromEntries(ALL_PLAYER_LABELS.map((label) => [label, ''])) as PlayerNotes
}

/** Returns true when a player has written assignment notes. */
export function playerHasNotes(notes: PlayerNotes, playerId: PlayerLabel): boolean {
  return notes[playerId].trim().length > 0
}
