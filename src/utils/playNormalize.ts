import { DEFAULT_FRONT_ID } from '../data/builtinFronts'
import { DEFAULT_FORMATION_ID } from '../data/builtinFormations'
import { createEmptyBlocks } from '../types/block'
import { createEmptyMotions } from '../types/motion'
import { resolveDriveStartYardLine } from '../types/driveStart'
import { createEmptyPlay, type Play } from '../types/play'
import { createEmptyPlayerNotes } from '../types/playerNotes'
import { createEmptyDefenderRoutes } from '../types/defenderRoute'
import { resolvePlayType, type PlayType } from '../types/playType'
import { createEmptyRoutes } from '../types/route'
import type { CustomFormation } from './formationStorage'
import { migratePlayToFieldView } from './fieldView'
import { createEmptyPlayerActionChains } from '../types/playerAction'
import { ensurePlayPlayerActions } from './playerActionChains'
import { normalizeCategories } from './categoryUtils'
import {
  createDefendersForFront,
  getDefaultFrontName,
  getFrontLabel,
} from './frontUtils'
import {
  createPlayersForFormation,
  getDefaultFormationName,
  getFormationLabel,
} from './formationUtils'
import { normalizePositionLabel, type Player } from '../types/player'
import {
  COORDINATE_SPACE_DB,
  COORDINATE_SPACE_RENDER,
  dbPlayToRenderPlay,
  hasSavedDefenderPositions,
  hasSavedPlayerPositions,
} from './positionCoordinates'
import { clampPlayPositions } from './losClamp'

export type LegacyPlay = Play & {
  formation?: string
  fieldPosition?: string
}

export function normalizePlayRecord(
  play: LegacyPlay,
  customFormations: CustomFormation[],
): Play {
  const playType: PlayType = resolvePlayType(play.playType)
  const formationId = play.formationId ?? play.formation ?? DEFAULT_FORMATION_ID
  const formationName =
    play.formationName ??
    getFormationLabel(formationId, customFormations) ??
    getDefaultFormationName()

  const frontId = play.frontId ?? DEFAULT_FRONT_ID
  const frontName = play.frontName ?? getFrontLabel(frontId) ?? getDefaultFrontName()

  const savedPlayers = hasSavedPlayerPositions(play.players)
  const savedDefenders = hasSavedDefenderPositions(play.defenders)

  function normalizeLoadedPlayer(player: Player): Player {
    if (player.label === undefined || player.label === null) {
      return { ...player, label: player.id }
    }
    return { ...player, label: normalizePositionLabel(player.label) }
  }

  const loadedPlayers = savedPlayers
    ? play.players.map(normalizeLoadedPlayer)
    : createPlayersForFormation(formationId, customFormations)

  const normalized: Play = {
    ...createEmptyPlay(playType),
    ...play,
    formationId,
    formationName,
    frontId,
    frontName,
    opponentFormationId: play.opponentFormationId ?? null,
    opponentFormationName: play.opponentFormationName ?? null,
    driveStartYardLine: resolveDriveStartYardLine(play),
    players: loadedPlayers,
    defenders: savedDefenders ? play.defenders : createDefendersForFront(frontId),
    routes: play.routes ?? createEmptyRoutes(),
    blocks: play.blocks ?? createEmptyBlocks(),
    motions: play.motions ?? createEmptyMotions(),
    playerActions: play.playerActions ?? createEmptyPlayerActionChains(),
    playerNotes: {
      ...createEmptyPlayerNotes(),
      ...play.playerNotes,
    },
    defenderRoutes: play.defenderRoutes ?? createEmptyDefenderRoutes(),
    playType,
    categories: normalizeCategories(play.categories),
  }

  const fromDatabase = normalized.positionFormat === COORDINATE_SPACE_DB
  const renderPlay = fromDatabase ? dbPlayToRenderPlay(normalized) : normalized

  const migrated = fromDatabase ? renderPlay : migratePlayToFieldView(renderPlay)

  return ensurePlayPlayerActions({
    ...clampPlayPositions(migrated),
    positionFormat: COORDINATE_SPACE_RENDER,
  })
}
