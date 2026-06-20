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
import { migratePlayToFieldView, migrateLosAnchorPlay } from './fieldView'
import { createEmptyPlayerActionChains } from '../types/playerAction'
import { ensurePlayPlayerActions } from './playerActionChains'
import { normalizeCategories } from './categoryUtils'
import {
  getDefaultFrontName,
  getFrontLabel,
} from './frontUtils'
import {
  getDefaultFormationName,
  getFormationLabel,
} from './formationUtils'
import type { TeamFormat } from '../types/teamFormat'
import { DEFAULT_TEAM_FORMAT } from '../types/teamFormat'
import {
  applyTeamFormatToPlay,
  createDefendersForTeamFormat,
  createPlayersForTeamFormat,
} from './teamFormatUtils'
import { normalizePositionLabel, type Player } from '../types/player'
import {
  COORDINATE_SPACE_DB,
  COORDINATE_SPACE_RENDER,
  dbPlayToRenderPlay,
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
  teamFormat: TeamFormat = DEFAULT_TEAM_FORMAT,
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

  function normalizeLoadedPlayer(player: Player): Player {
    if (player.label === undefined || player.label === null) {
      return { ...player, label: player.id }
    }
    return { ...player, label: normalizePositionLabel(player.label) }
  }

  const loadedPlayers = Array.isArray(play.players)
    ? savedPlayers
      ? play.players.map(normalizeLoadedPlayer)
      : []
    : createPlayersForTeamFormat(teamFormat, formationId, customFormations)

  const loadedDefenders = Array.isArray(play.defenders)
    ? play.defenders
    : createDefendersForTeamFormat(teamFormat, frontId)

  const normalized: Play = {
    ...createEmptyPlay(playType, teamFormat),
    ...play,
    formationId,
    formationName,
    frontId,
    frontName,
    opponentFormationId: play.opponentFormationId ?? null,
    opponentFormationName: play.opponentFormationName ?? null,
    driveStartYardLine: resolveDriveStartYardLine(play),
    players: loadedPlayers,
    defenders: loadedDefenders,
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

  const migrated = fromDatabase
    ? migrateLosAnchorPlay(renderPlay)
    : migratePlayToFieldView(renderPlay)

  return ensurePlayPlayerActions({
    ...applyTeamFormatToPlay(
      {
        ...clampPlayPositions(migrated),
        positionFormat: COORDINATE_SPACE_RENDER,
      },
      teamFormat,
    ),
    positionFormat: COORDINATE_SPACE_RENDER,
  })
}
