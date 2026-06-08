import { DEFAULT_FORMATION_ID } from '../data/builtinFormations'
import { createEmptyBlocks, type Block } from './block'
import type { Player } from './player'
import { createEmptyPlayerNotes, type PlayerNotes } from './playerNotes'
import { createEmptyRoutes, type Route } from './route'
import {
  createPlayersForFormation,
  getDefaultFormationName,
} from '../utils/formationUtils'

/**
 * A Play holds everything the user creates for one football play.
 */
export type Play = {
  id: string
  name: string
  notes: string
  /** Built-in id (e.g. i-formation) or custom id (custom-uuid). */
  formationId: string
  /** Formation name at save time — kept if custom formation is later deleted. */
  formationName: string
  mirrored: boolean
  players: Player[]
  routes: Route[]
  blocks: Block[]
  playerNotes: PlayerNotes
  createdAt: string
}

/** Creates a fresh play with the default I Formation. */
export function createEmptyPlay(): Play {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Play',
    notes: '',
    formationId: DEFAULT_FORMATION_ID,
    formationName: getDefaultFormationName(),
    mirrored: false,
    players: createPlayersForFormation(DEFAULT_FORMATION_ID, []),
    routes: createEmptyRoutes(),
    blocks: createEmptyBlocks(),
    playerNotes: createEmptyPlayerNotes(),
    createdAt: new Date().toISOString(),
  }
}
