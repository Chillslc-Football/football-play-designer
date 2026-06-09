import { DEFAULT_FORMATION_ID } from '../data/builtinFormations'
import { DEFAULT_FRONT_ID } from '../data/builtinFronts'
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
import { createDefendersForFront, getDefaultFrontName } from '../utils/frontUtils'
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
  /** Built-in defensive front id (e.g. 4-3, nickel). */
  frontId: string
  /** Defensive front name at save time. */
  frontName: string
  /** Future: opposing offensive formation id for defensive plays. */
  opponentFormationId: string | null
  /** Future: opposing offensive formation label for defensive plays. */
  opponentFormationName: string | null
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
  /** Category tags for filtering (Run, Pass, custom labels, etc.). */
  categories: string[]
  createdAt: string
}

/** Creates a fresh play for the given mode. */
export function createEmptyPlay(playType: PlayType = DEFAULT_PLAY_TYPE): Play {
  return clampPlayPositions({
    id: crypto.randomUUID(),
    name: 'Untitled Play',
    notes: '',
    formationId: DEFAULT_FORMATION_ID,
    formationName: getDefaultFormationName(),
    frontId: DEFAULT_FRONT_ID,
    frontName: getDefaultFrontName(),
    opponentFormationId: null,
    opponentFormationName: null,
    driveStartYardLine: DEFAULT_DRIVE_START,
    mirrored: false,
    playType,
    players: createPlayersForFormation(DEFAULT_FORMATION_ID, []),
    defenders: createDefendersForFront(DEFAULT_FRONT_ID),
    routes: createEmptyRoutes(),
    blocks: createEmptyBlocks(),
    defenderRoutes: createEmptyDefenderRoutes(),
    playerNotes: createEmptyPlayerNotes(),
    categories: [],
    createdAt: new Date().toISOString(),
  })
}
