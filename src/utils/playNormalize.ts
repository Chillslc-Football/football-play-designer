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
import { getDefaultFormationName, getFormationLabel } from './formationUtils'

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
    routes: play.routes ?? createEmptyRoutes(),
    blocks: play.blocks ?? createEmptyBlocks(),
    playerNotes: {
      ...createEmptyPlayerNotes(),
      ...play.playerNotes,
    },
    defenders: play.defenders ?? createDefendersForFront(frontId),
    playType,
    defenderRoutes: play.defenderRoutes ?? createEmptyDefenderRoutes(),
    categories: normalizeCategories(play.categories),
  }

  return clampPlayPositions(migratePlayToFieldView(normalized))
}
