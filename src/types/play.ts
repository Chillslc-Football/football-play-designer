import { createDefault43Defense } from '../data/defaultDefense'
import { DEFAULT_FORMATION_ID } from '../data/builtinFormations'
import { createEmptyBlocks, type Block } from './block'
import type { Defender } from './defender'
import type { DriveStartYardLine } from './driveStart'
import { DEFAULT_DRIVE_START } from './driveStart'
import type { Player } from './player'
import { createEmptyPlayerNotes, type PlayerNotes } from './playerNotes'
import { createEmptyDefenderRoutes, type DefenderRoute } from './defenderRoute'
import { createEmptyRoutes, type Route } from './route'
import { DEFAULT_PLAY_TYPE, type PlayType } from './playType'
import {
  createPlayersForFormation,
  getDefaultFormationName,
} from '../utils/formationUtils'
import { clampPlayPositions } from '../utils/losClamp'

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
  /** Line of scrimmage — drive start yard line for this play. */
  driveStartYardLine: DriveStartYardLine
  mirrored: boolean
  /** Offensive or defensive play design mode. */
  playType: PlayType
  players: Player[]
  defenders: Defender[]
  routes: Route[]
  blocks: Block[]
  defenderRoutes: DefenderRoute[]
  playerNotes: PlayerNotes
  createdAt: string
}

/** Creates a fresh play with the default I Formation and 4-3 defense. */
export function createEmptyPlay(): Play {
  return clampPlayPositions({
    id: crypto.randomUUID(),
    name: 'Untitled Play',
    notes: '',
    formationId: DEFAULT_FORMATION_ID,
    formationName: getDefaultFormationName(),
    driveStartYardLine: DEFAULT_DRIVE_START,
    mirrored: false,
    playType: DEFAULT_PLAY_TYPE,
    players: createPlayersForFormation(DEFAULT_FORMATION_ID, []),
    defenders: createDefault43Defense(),
    routes: createEmptyRoutes(),
    blocks: createEmptyBlocks(),
    defenderRoutes: createEmptyDefenderRoutes(),
    playerNotes: createEmptyPlayerNotes(),
    createdAt: new Date().toISOString(),
  })
}
