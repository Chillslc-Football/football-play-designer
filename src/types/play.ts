import {
  createPlayersForFormation,
  DEFAULT_FORMATION_ID,
  type FormationId,
} from '../data/formations'
import type { Player } from './player'
import { createEmptyPlayerNotes, type PlayerNotes } from './playerNotes'
import { createEmptyRoutes, type Route } from './route'

/**
 * A Play holds everything the user creates for one football play.
 */
export type Play = {
  id: string
  name: string
  notes: string
  formation: FormationId
  mirrored: boolean
  players: Player[]
  routes: Route[]
  /** Per-player assignment notes, keyed by player id (QB, RB, X, etc.). */
  playerNotes: PlayerNotes
  createdAt: string
}

/** Creates a fresh play with the default I Formation. */
export function createEmptyPlay(): Play {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Play',
    notes: '',
    formation: DEFAULT_FORMATION_ID,
    mirrored: false,
    players: createPlayersForFormation(DEFAULT_FORMATION_ID),
    routes: createEmptyRoutes(),
    playerNotes: createEmptyPlayerNotes(),
    createdAt: new Date().toISOString(),
  }
}
