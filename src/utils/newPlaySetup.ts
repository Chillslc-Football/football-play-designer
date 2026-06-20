import { createEmptyBlocks } from '../types/block'
import { createEmptyMotions } from '../types/motion'
import { createEmptyDefenderRoutes } from '../types/defenderRoute'
import { createEmptyPlay, type Play } from '../types/play'
import { createEmptyPlayerActionChains } from '../types/playerAction'
import { createEmptyRoutes } from '../types/route'
import { normalizeCategories } from './categoryUtils'
import { getFrontById } from './frontUtils'
import { getFormationById } from './formationUtils'
import type { CustomFormation } from './formationStorage'
import { DEFAULT_TEAM_FORMAT, type TeamFormat } from '../types/teamFormat'
import {
  applyTeamFormatToPlay,
  createDefendersForTeamFormat,
  createPlayersForTeamFormat,
} from './teamFormatUtils'
import { clampDefensePosition, clampOffensePosition, clampPlayPositions } from './losClamp'
import { normalizePlayName } from './playStorage'

export type NewPlaySetupInput = {
  name: string
  formationId: string
  frontId: string | null
  categories: string[]
  notes: string
}

/** Same player/layout update as sidebar formation change (clears offensive drawings). */
export function applyFormationChangeToPlay(
  current: Play,
  formationId: string,
  customFormations: CustomFormation[],
  teamFormat: TeamFormat = DEFAULT_TEAM_FORMAT,
): Play {
  const formation = getFormationById(formationId, customFormations)
  if (!formation) return current

  const players = createPlayersForTeamFormat(teamFormat, formationId, customFormations).map(
    (player) => ({
      ...player,
      position: clampOffensePosition(player.position),
    }),
  )

  return applyTeamFormatToPlay(
    {
      ...current,
      formationId,
      formationName: formation.label,
      players,
      routes: createEmptyRoutes(),
      blocks: createEmptyBlocks(),
      motions: createEmptyMotions(),
      playerActions: createEmptyPlayerActionChains(),
      defenderRoutes: createEmptyDefenderRoutes(),
      notes: current.notes,
      playerNotes: current.playerNotes,
      mirrored: false,
    },
    teamFormat,
  )
}

/** Same defender layout update as sidebar front change (clears defender routes). */
export function applyFrontChangeToPlay(
  current: Play,
  frontId: string,
  teamFormat: TeamFormat = DEFAULT_TEAM_FORMAT,
): Play {
  const front = getFrontById(frontId)
  if (!front) return current

  const defenders = createDefendersForTeamFormat(teamFormat, frontId).map((defender) => ({
    ...defender,
    position: clampDefensePosition(defender.position),
  }))

  return applyTeamFormatToPlay(
    {
      ...current,
      frontId,
      frontName: front.label,
      defenders,
      defenderRoutes: createEmptyDefenderRoutes(),
    },
    teamFormat,
  )
}

/** Loads opposing offense onto a defensive play (same as Load Offensive Formation). */
export function applyOpposingFormationToPlay(
  current: Play,
  formationId: string,
  customFormations: CustomFormation[],
  teamFormat: TeamFormat = DEFAULT_TEAM_FORMAT,
): Play {
  const formation = getFormationById(formationId, customFormations)
  if (!formation) return current

  const players = createPlayersForTeamFormat(teamFormat, formationId, customFormations).map(
    (player) => ({
      ...player,
      position: clampOffensePosition(player.position),
    }),
  )

  return applyTeamFormatToPlay(
    {
      ...current,
      formationId: formation.id,
      formationName: formation.label,
      opponentFormationId: formationId,
      opponentFormationName: formation.label,
      players,
    },
    teamFormat,
  )
}

function withSetupMetadata(current: Play, setup: NewPlaySetupInput): Play {
  return {
    ...current,
    name: normalizePlayName(setup.name),
    notes: setup.notes.trim(),
    categories: normalizeCategories(setup.categories),
  }
}

/** Builds a fresh play from setup modal values — never copies players from the current play. */
export function buildNewPlayFromSetup(
  source: Play,
  setup: NewPlaySetupInput,
  customFormations: CustomFormation[],
  teamFormat: TeamFormat = DEFAULT_TEAM_FORMAT,
): Play {
  let next = createEmptyPlay(source.playType, teamFormat)

  next = {
    ...next,
    name: normalizePlayName(setup.name),
    notes: setup.notes.trim(),
    categories: normalizeCategories(setup.categories),
  }

  if (next.playType === 'offensive') {
    const formation = getFormationById(setup.formationId, customFormations)
    if (formation) {
      next = {
        ...next,
        formationId: setup.formationId,
        formationName: formation.label,
        players: createPlayersForTeamFormat(teamFormat, setup.formationId, customFormations).map(
          (player) => ({
            ...player,
            position: clampOffensePosition(player.position),
          }),
        ),
        routes: createEmptyRoutes(),
        blocks: createEmptyBlocks(),
        motions: createEmptyMotions(),
        playerActions: createEmptyPlayerActionChains(),
      }
    }
  }

  if (next.playType === 'defensive') {
    if (setup.frontId) {
      const front = getFrontById(setup.frontId)
      if (front) {
        next = {
          ...next,
          frontId: setup.frontId,
          frontName: front.label,
          defenders: createDefendersForTeamFormat(teamFormat, setup.frontId).map((defender) => ({
            ...defender,
            position: clampDefensePosition(defender.position),
          })),
          defenderRoutes: createEmptyDefenderRoutes(),
        }
      }
    }

    if (setup.formationId) {
      const opponentFormation = getFormationById(setup.formationId, customFormations)
      if (opponentFormation) {
        next = {
          ...next,
          opponentFormationId: setup.formationId,
          opponentFormationName: opponentFormation.label,
          players: createPlayersForTeamFormat(teamFormat, setup.formationId, customFormations).map(
            (player) => ({
              ...player,
              position: clampOffensePosition(player.position),
            }),
          ),
        }
      }
    }
  }

  if (next.playType === 'offensive' && setup.frontId) {
    const front = getFrontById(setup.frontId)
    if (front) {
      next = {
        ...next,
        frontId: setup.frontId,
        frontName: front.label,
        defenders: createDefendersForTeamFormat(teamFormat, setup.frontId).map((defender) => ({
          ...defender,
          position: clampDefensePosition(defender.position),
        })),
        defenderRoutes: createEmptyDefenderRoutes(),
      }
    }
  } else if (next.playType === 'offensive') {
    next = {
      ...next,
      defenders: [],
      defenderRoutes: createEmptyDefenderRoutes(),
    }
  }

  return applyTeamFormatToPlay(clampPlayPositions(next), teamFormat)
}

export type NewPlaySetupDefaults = {
  name: string
  formationId: string
  frontId: string
  categories: string[]
  notes: string
}

export function getNewPlaySetupDefaults(source: Play): NewPlaySetupDefaults {
  return {
    name: 'Untitled Play',
    formationId: source.formationId,
    frontId: source.playType === 'offensive' ? '' : source.frontId,
    categories: [],
    notes: '',
  }
}

export function getPlaySetupDefaultsFromPlay(play: Play): NewPlaySetupDefaults {
  return {
    name: play.name,
    formationId: play.playType === 'defensive' ? play.opponentFormationId ?? '' : play.formationId,
    frontId: play.frontId,
    categories: [...play.categories],
    notes: play.notes,
  }
}

/** Applies setup edits to the current play, reusing sidebar formation/front behavior when changed. */
export function applyPlaySetupEdit(
  current: Play,
  setup: NewPlaySetupInput,
  customFormations: CustomFormation[],
  teamFormat: TeamFormat = DEFAULT_TEAM_FORMAT,
): Play {
  let next = withSetupMetadata(current, setup)

  if (next.playType === 'offensive') {
    if (setup.formationId && setup.formationId !== current.formationId) {
      next = withSetupMetadata(
        applyFormationChangeToPlay(next, setup.formationId, customFormations, teamFormat),
        setup,
      )
    } else if (setup.formationId) {
      const formation = getFormationById(setup.formationId, customFormations)
      if (formation) {
        next = {
          ...next,
          formationId: setup.formationId,
          formationName: formation.label,
        }
      }
    }

    if (setup.frontId) {
      const shouldLoadFront =
        setup.frontId !== current.frontId || current.defenders.length === 0
      if (shouldLoadFront) {
        next = withSetupMetadata(applyFrontChangeToPlay(next, setup.frontId, teamFormat), setup)
      }
    } else if (current.defenders.length > 0) {
      next = {
        ...next,
        defenders: [],
        defenderRoutes: createEmptyDefenderRoutes(),
      }
    }

    return applyTeamFormatToPlay(clampPlayPositions(next), teamFormat)
  }

  if (setup.frontId && setup.frontId !== current.frontId) {
    next = withSetupMetadata(applyFrontChangeToPlay(next, setup.frontId, teamFormat), setup)
  }

  if (setup.formationId) {
    if (setup.formationId !== (current.opponentFormationId ?? '')) {
      next = withSetupMetadata(
        applyOpposingFormationToPlay(next, setup.formationId, customFormations, teamFormat),
        setup,
      )
    } else {
      const opponentFormation = getFormationById(setup.formationId, customFormations)
      if (opponentFormation) {
        next = {
          ...next,
          opponentFormationId: setup.formationId,
          opponentFormationName: opponentFormation.label,
        }
      }
    }
  } else {
    next = {
      ...next,
      opponentFormationId: null,
      opponentFormationName: null,
    }
  }

  return applyTeamFormatToPlay(clampPlayPositions(next), teamFormat)
}
