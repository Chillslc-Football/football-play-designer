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

/** Updates setup metadata on the current play without resetting drawings or positions. */
export function applyPlaySetupEdit(
  current: Play,
  setup: NewPlaySetupInput,
  customFormations: CustomFormation[],
): Play {
  let next: Play = {
    ...current,
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
      }
    }

    if (setup.frontId) {
      const front = getFrontById(setup.frontId)
      if (front) {
        next = {
          ...next,
          frontId: setup.frontId,
          frontName: front.label,
        }
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
        }
      }
    } else {
      next = {
        ...next,
        opponentFormationId: null,
        opponentFormationName: null,
      }
    }
  }

  return next
}
