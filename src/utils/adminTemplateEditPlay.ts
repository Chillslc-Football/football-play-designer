import { defendersFromFront, type FrontDefinition } from '../data/builtinFronts'
import type { AdminTemplateEditSession } from '../types/adminTemplateEdit'
import type { DefenderLabel } from '../types/defender'
import type { PlayerLabel, Position } from '../types/player'
import { createEmptyBlocks } from '../types/block'
import { createEmptyDefenderRoutes } from '../types/defenderRoute'
import { createEmptyMotions } from '../types/motion'
import { createEmptyPlay, type Play } from '../types/play'
import { createEmptyPlayerActionChains } from '../types/playerAction'
import { createEmptyPlayerNotes } from '../types/playerNotes'
import { createEmptyRoutes } from '../types/route'
import { playersFromPositions, positionLabelsFromPlayers, positionsFromPlayers } from './formationUtils'
import { positionsFromDefenders } from './frontUtils'

export function createPlayForAdminTemplateEdit(session: AdminTemplateEditSession): Play {
  const playType = session.kind === 'formation' ? 'offensive' : 'defensive'
  const base = createEmptyPlay(playType)

  if (session.kind === 'formation') {
    const players = playersFromPositions(
      session.positions as Record<PlayerLabel, Position>,
      session.positionLabels,
    )

    return {
      ...base,
      name: `Template: ${session.label || 'New Formation'}`,
      formationId: session.slug || 'new-formation',
      formationName: session.label || 'New Formation',
      players,
      defenders: [],
      routes: createEmptyRoutes(),
      blocks: createEmptyBlocks(),
      motions: createEmptyMotions(),
      playerActions: createEmptyPlayerActionChains(),
      defenderRoutes: createEmptyDefenderRoutes(),
      playerNotes: createEmptyPlayerNotes(),
      categories: [],
    }
  }

  const positions = session.positions as Record<DefenderLabel, Position>
  const front: FrontDefinition = {
    id: (session.slug || 'new-front') as FrontDefinition['id'],
    label: session.label || 'New Front',
    positions,
    isBuiltin: true,
  }

  return {
    ...base,
    name: `Template: ${session.label || 'New Front'}`,
    frontId: session.slug || 'new-front',
    frontName: session.label || 'New Front',
    players: [],
    defenders: defendersFromFront(front),
    routes: createEmptyRoutes(),
    blocks: createEmptyBlocks(),
    motions: createEmptyMotions(),
    playerActions: createEmptyPlayerActionChains(),
    defenderRoutes: createEmptyDefenderRoutes(),
    playerNotes: createEmptyPlayerNotes(),
    categories: [],
  }
}

export function positionsFromAdminTemplatePlay(play: Play, kind: AdminTemplateEditSession['kind']) {
  if (kind === 'formation') {
    return {
      positions: positionsFromPlayers(play.players),
      positionLabels: positionLabelsFromPlayers(play.players),
    }
  }

  return {
    positions: positionsFromDefenders(play.defenders),
    positionLabels: undefined,
  }
}
