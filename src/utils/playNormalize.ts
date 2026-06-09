import { DEFAULT_FRONT_ID } from '../data/builtinFronts'
import { DEFAULT_FORMATION_ID } from '../data/builtinFormations'
import { createEmptyBlocks } from '../types/block'
import { resolveDriveStartYardLine } from '../types/driveStart'
import { createEmptyPlay, type Play } from '../types/play'
import { createEmptyPlayerNotes } from '../types/playerNotes'
import { createEmptyDefenderRoutes } from '../types/defenderRoute'
import { resolvePlayType, type PlayType } from '../types/playType'
import { createEmptyRoutes } from '../types/route'
import type { CustomFormation } from './formationStorage'
import { migratePlayToFieldView } from './fieldView'
import { clampPlayPositions } from './losClamp'
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
import {
  COORDINATE_SPACE_DB,
  COORDINATE_SPACE_RENDER,
  dbPlayToRenderPlay,
  hasSavedDefenderPositions,
  hasSavedPlayerPositions,
} from './positionCoordinates'

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
    players: savedPlayers
      ? play.players
      : createPlayersForFormation(formationId, customFormations),
    defenders: savedDefenders ? play.defenders : createDefendersForFront(frontId),
    routes: play.routes ?? createEmptyRoutes(),
    blocks: play.blocks ?? createEmptyBlocks(),
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

  return {
    ...clampPlayPositions(migrated),
    positionFormat: COORDINATE_SPACE_RENDER,
  }
}
