import { createDefault43Defense } from '../data/defaultDefense'
import { DEFAULT_FORMATION_ID } from '../data/builtinFormations'
import { createEmptyBlocks } from '../types/block'
import { resolveDriveStartYardLine } from '../types/driveStart'
import { createEmptyPlay, type Play } from '../types/play'
import { createEmptyPlayerNotes } from '../types/playerNotes'
import { createEmptyDefenderRoutes } from '../types/defenderRoute'
import { resolvePlayType } from '../types/playType'
import { createEmptyRoutes } from '../types/route'
import type { CustomFormation } from './formationStorage'
import { migratePlayToFieldView } from './fieldView'
import { clampPlayPositions } from './losClamp'
import { getDefaultFormationName, getFormationLabel } from './formationUtils'

export type LegacyPlay = Play & {
  formation?: string
  fieldPosition?: string
}

export function normalizePlayRecord(
  play: LegacyPlay,
  customFormations: CustomFormation[],
): Play {
  const formationId = play.formationId ?? play.formation ?? DEFAULT_FORMATION_ID
  const formationName =
    play.formationName ??
    getFormationLabel(formationId, customFormations) ??
    getDefaultFormationName()

  const normalized: Play = {
    ...createEmptyPlay(),
    ...play,
    formationId,
    formationName,
    driveStartYardLine: resolveDriveStartYardLine(play),
    routes: play.routes ?? createEmptyRoutes(),
    blocks: play.blocks ?? createEmptyBlocks(),
    playerNotes: {
      ...createEmptyPlayerNotes(),
      ...play.playerNotes,
    },
    defenders: play.defenders ?? createDefault43Defense(),
    playType: resolvePlayType(play.playType),
    defenderRoutes: play.defenderRoutes ?? createEmptyDefenderRoutes(),
  }

  return clampPlayPositions(migratePlayToFieldView(normalized))
}
