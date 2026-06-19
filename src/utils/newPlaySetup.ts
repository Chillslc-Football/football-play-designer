import { createEmptyBlocks } from '../types/block'
import { createEmptyMotions } from '../types/motion'
import { createEmptyDefenderRoutes } from '../types/defenderRoute'
import { createPlayFromCurrentScheme, type Play } from '../types/play'
import { createEmptyPlayerActionChains } from '../types/playerAction'
import { createEmptyRoutes } from '../types/route'
import { normalizeCategories } from './categoryUtils'
import { createDefendersForFront, getFrontById } from './frontUtils'
import {
  createPlayersForFormation,
  getFormationById,
} from './formationUtils'
import type { CustomFormation } from './formationStorage'
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
): Play {
  const formation = getFormationById(formationId, customFormations)
  if (!formation) return current

  const players = createPlayersForFormation(formationId, customFormations).map((player) => ({
    ...player,
    position: clampOffensePosition(player.position),
  }))

  return {
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
  }
}

/** Same defender layout update as sidebar front change (clears defender routes). */
export function applyFrontChangeToPlay(current: Play, frontId: string): Play {
  const front = getFrontById(frontId)
  if (!front) return current

  const defenders = createDefendersForFront(frontId).map((defender) => ({
    ...defender,
    position: clampDefensePosition(defender.position),
  }))

  return {
    ...current,
    frontId,
    frontName: front.label,
    defenders,
    defenderRoutes: createEmptyDefenderRoutes(),
  }
}

/** Loads opposing offense onto a defensive play (same as Load Offensive Formation). */
export function applyOpposingFormationToPlay(
  current: Play,
  formationId: string,
  customFormations: CustomFormation[],
): Play {
  const formation = getFormationById(formationId, customFormations)
  if (!formation) return current

  const players = createPlayersForFormation(formationId, customFormations).map((player) => ({
    ...player,
    position: clampOffensePosition(player.position),
  }))

  return {
    ...current,
    formationId: formation.id,
    formationName: formation.label,
    opponentFormationId: formationId,
    opponentFormationName: formation.label,
    players,
  }
}

function withSetupMetadata(current: Play, setup: NewPlaySetupInput): Play {
  return {
    ...current,
    name: normalizePlayName(setup.name),
    notes: setup.notes.trim(),
    categories: normalizeCategories(setup.categories),
  }
}

/** Builds a fresh play from the current editor scheme plus setup modal values. */
export function buildNewPlayFromSetup(
  source: Play,
  setup: NewPlaySetupInput,
  customFormations: CustomFormation[],
): Play {
  let next = createPlayFromCurrentScheme(source)

  next = {
    ...next,
    name: normalizePlayName(setup.name),
    notes: setup.notes.trim(),
    categories: normalizeCategories(setup.categories),
  }

  if (next.playType === 'offensive') {
    const formation = getFormationById(setup.formationId, customFormations)
    if (formation) {
      const players = createPlayersForFormation(setup.formationId, customFormations).map(
        (player) => ({
          ...player,
          position: clampOffensePosition(player.position),
        }),
      )

      next = {
        ...next,
        formationId: setup.formationId,
        formationName: formation.label,
        players,
        routes: createEmptyRoutes(),
        blocks: createEmptyBlocks(),
        motions: createEmptyMotions(),
        playerActions: createEmptyPlayerActionChains(),
      }
    }
  }

  if (next.playType === 'defensive' && setup.formationId) {
    const opponentFormation = getFormationById(setup.formationId, customFormations)
    if (opponentFormation) {
      next = {
        ...next,
        opponentFormationId: setup.formationId,
        opponentFormationName: opponentFormation.label,
      }
    }
  }

  if (setup.frontId) {
    const front = getFrontById(setup.frontId)
    if (front) {
      const defenders = createDefendersForFront(setup.frontId).map((defender) => ({
        ...defender,
        position: clampDefensePosition(defender.position),
      }))

      next = {
        ...next,
        frontId: setup.frontId,
        frontName: front.label,
        defenders,
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

  return clampPlayPositions(next)
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
): Play {
  let next = withSetupMetadata(current, setup)

  if (next.playType === 'offensive') {
    if (setup.formationId && setup.formationId !== current.formationId) {
      next = withSetupMetadata(
        applyFormationChangeToPlay(next, setup.formationId, customFormations),
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
        next = withSetupMetadata(applyFrontChangeToPlay(next, setup.frontId), setup)
      }
    } else if (current.defenders.length > 0) {
      next = {
        ...next,
        defenders: [],
        defenderRoutes: createEmptyDefenderRoutes(),
      }
    }

    return clampPlayPositions(next)
  }

  if (setup.frontId && setup.frontId !== current.frontId) {
    next = withSetupMetadata(applyFrontChangeToPlay(next, setup.frontId), setup)
  }

  if (setup.formationId) {
    if (setup.formationId !== (current.opponentFormationId ?? '')) {
      next = withSetupMetadata(
        applyOpposingFormationToPlay(next, setup.formationId, customFormations),
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

  return clampPlayPositions(next)
}
