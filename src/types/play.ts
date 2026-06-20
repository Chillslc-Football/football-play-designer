import { createEmptyBlocks, type Block } from './block'
import { createEmptyMotions, type Motion } from './motion'
import type { Defender } from './defender'
import type { DriveStartYardLine } from './driveStart'
import { DEFAULT_DRIVE_START } from './driveStart'
import type { Player } from './player'
import { createEmptyPlayerNotes, type PlayerNotes } from './playerNotes'
import { createEmptyDefenderRoutes, type DefenderRoute } from './defenderRoute'
import { createEmptyRoutes, type Route } from './route'
import { DEFAULT_PLAY_TYPE, type PlayType } from './playType'
import {
  createPlayersForTeamFormat,
  createDefendersForTeamFormat,
} from '../utils/teamFormatUtils'
import { DEFAULT_TEAM_FORMAT, type TeamFormat } from '../types/teamFormat'
import { getDefaultFormationName } from '../utils/formationUtils'
import { COORDINATE_SPACE_RENDER } from '../utils/positionCoordinates'
import { LOS_ANCHOR_VERSION } from '../constants/field'
import { getDefaultFrontName } from '../utils/frontUtils'
import {
  getDefaultFormationTemplateId,
  getDefaultFrontTemplateId,
} from '../utils/schemeTemplateStore'
import {
  createEmptyPlayerActionChains,
  type PlayerAction,
  type PlayerActionChains,
} from './playerAction'
import type { Position } from './player'
import { clampPlayPositions } from '../utils/losClamp'

/** How player/defender/path coordinates are stored in persistence. */
export type PositionFormat = 'yard' | 'normalized'

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
  motions: Motion[]
  playerActions: PlayerActionChains
  defenderRoutes: DefenderRoute[]
  playerNotes: PlayerNotes
  /** Category tags for filtering (Run, Pass, custom labels, etc.). */
  categories: string[]
  /** Runtime uses yards; persisted plays may use normalized 0–100 percentages. */
  positionFormat?: PositionFormat
  /** LOS anchor epoch — used to migrate saved coordinates when the default LOS moves. */
  losAnchorVersion?: number
  createdAt: string
}

/** Creates a fresh play for the given mode. */
export function createEmptyPlay(
  playType: PlayType = DEFAULT_PLAY_TYPE,
  teamFormat: TeamFormat = DEFAULT_TEAM_FORMAT,
): Play {
  const defaultFormationId = getDefaultFormationTemplateId()
  const defaultFrontId = getDefaultFrontTemplateId()

  const shared = {
    id: crypto.randomUUID(),
    name: 'Untitled Play',
    notes: '',
    formationId: defaultFormationId,
    formationName: getDefaultFormationName(),
    frontId: defaultFrontId,
    frontName: getDefaultFrontName(),
    opponentFormationId: null,
    opponentFormationName: null,
    driveStartYardLine: DEFAULT_DRIVE_START,
    mirrored: false,
    playType,
    routes: createEmptyRoutes(),
    blocks: createEmptyBlocks(),
    motions: createEmptyMotions(),
    playerActions: createEmptyPlayerActionChains(),
    defenderRoutes: createEmptyDefenderRoutes(),
    playerNotes: createEmptyPlayerNotes(),
    categories: [],
    positionFormat: COORDINATE_SPACE_RENDER,
    losAnchorVersion: LOS_ANCHOR_VERSION,
    createdAt: new Date().toISOString(),
  }

  if (playType === 'defensive') {
    return clampPlayPositions({
      ...shared,
      players: [],
      defenders: createDefendersForTeamFormat(teamFormat, defaultFrontId),
    })
  }

  return clampPlayPositions({
    ...shared,
    players: createPlayersForTeamFormat(teamFormat, defaultFormationId, []),
    defenders: [],
  })
}

function copyPlayers(players: Player[]): Player[] {
  return players.map((player) => ({
    ...player,
    position: { ...player.position },
  }))
}

function copyDefenders(defenders: Defender[]): Defender[] {
  return defenders.map((defender) => ({
    ...defender,
    position: { ...defender.position },
  }))
}

function copyPathPoints(points: Position[]): Position[] {
  return points.map((point) => ({ ...point }))
}

function copyRoutes(routes: Route[]): Route[] {
  return routes.map((route) => ({
    ...route,
    points: copyPathPoints(route.points),
  }))
}

function copyBlocks(blocks: Block[]): Block[] {
  return blocks.map((block) => ({
    ...block,
    points: copyPathPoints(block.points),
  }))
}

function copyMotions(motions: Motion[]): Motion[] {
  return motions.map((motion) => ({
    ...motion,
    points: copyPathPoints(motion.points),
  }))
}

function copyPlayerActions(chains: PlayerActionChains): PlayerActionChains {
  const copied = createEmptyPlayerActionChains()

  for (const playerId of Object.keys(chains) as Array<keyof PlayerActionChains>) {
    copied[playerId] = (chains[playerId] ?? []).map(
      (action): PlayerAction => ({
        ...action,
        points: copyPathPoints(action.points),
      }),
    )
  }

  return copied
}

function copyDefenderRoutes(routes: DefenderRoute[]): DefenderRoute[] {
  return routes.map((route) => ({
    ...route,
    points: copyPathPoints(route.points),
  }))
}

/** Full copy of a play for Save As New — new id, keeps all drawing and metadata. */
export function duplicatePlay(source: Play, name: string): Play {
  return {
    ...source,
    id: crypto.randomUUID(),
    name,
    players: copyPlayers(source.players),
    defenders: copyDefenders(source.defenders),
    routes: copyRoutes(source.routes),
    blocks: copyBlocks(source.blocks),
    motions: copyMotions(source.motions),
    playerActions: copyPlayerActions(source.playerActions),
    defenderRoutes: copyDefenderRoutes(source.defenderRoutes),
    playerNotes: { ...source.playerNotes },
    categories: [...source.categories],
    positionFormat: COORDINATE_SPACE_RENDER,
    createdAt: new Date().toISOString(),
  }
}

/** New blank play that keeps the current formation/front and optional opponent side. */
export function createPlayFromCurrentScheme(source: Play): Play {
  const isOffense = source.playType === 'offensive'

  return clampPlayPositions({
    id: crypto.randomUUID(),
    name: 'Untitled Play',
    notes: '',
    formationId: source.formationId,
    formationName: source.formationName,
    frontId: source.frontId,
    frontName: source.frontName,
    opponentFormationId: source.opponentFormationId,
    opponentFormationName: source.opponentFormationName,
    driveStartYardLine: source.driveStartYardLine,
    mirrored: false,
    playType: source.playType,
    players: isOffense
      ? copyPlayers(source.players)
      : source.players.length > 0
        ? copyPlayers(source.players)
        : [],
    defenders: isOffense
      ? source.defenders.length > 0
        ? copyDefenders(source.defenders)
        : []
      : copyDefenders(source.defenders),
    routes: createEmptyRoutes(),
    blocks: createEmptyBlocks(),
    motions: createEmptyMotions(),
    playerActions: createEmptyPlayerActionChains(),
    defenderRoutes: createEmptyDefenderRoutes(),
    playerNotes: createEmptyPlayerNotes(),
    categories: [],
    positionFormat: COORDINATE_SPACE_RENDER,
    losAnchorVersion: LOS_ANCHOR_VERSION,
    createdAt: new Date().toISOString(),
  })
}
