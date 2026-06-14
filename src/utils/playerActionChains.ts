import type { Block } from '../types/block'
import type { Motion, MotionType } from '../types/motion'
import type { Play } from '../types/play'
import type { PlayerLabel, Position } from '../types/player'
import {
  createEmptyPlayerActionChains,
  type EndpointMarker,
  type PlayerAction,
  type PlayerActionChains,
  type PlayerActionType,
} from '../types/playerAction'
import type { Route } from '../types/route'
import { getMirrorPartner } from './footballMirror'
import { mirrorPositionLaterally } from './mirror'

export const NEW_ACTION_ID = '__new__'

export function defaultEndpointMarker(type: PlayerActionType): EndpointMarker {
  switch (type) {
    case 'route':
      return 'arrow'
    case 'motion':
      return 'filled-circle'
    case 'block':
      return 'blocking-line'
  }
}

export function drawingModeToActionType(mode: string): PlayerActionType | null {
  if (mode === 'route' || mode === 'motion' || mode === 'block') {
    return mode
  }
  return null
}

/** Preserves geometry and chain identity while switching action type. */
export function convertPlayerActionType(
  action: PlayerAction,
  newType: PlayerActionType,
  motionType: MotionType = 'jog',
): PlayerAction {
  const converted: PlayerAction = {
    id: action.id,
    type: newType,
    points: action.points,
    order: action.order,
    endpointMarker: defaultEndpointMarker(newType),
  }

  if (newType === 'motion') {
    converted.motionType = action.motionType ?? motionType
  }

  return converted
}

export function createPlayerAction(
  type: PlayerActionType,
  order: number,
  motionType?: MotionType,
): PlayerAction {
  return {
    id: crypto.randomUUID(),
    type,
    points: [],
    endpointMarker: defaultEndpointMarker(type),
    order,
    ...(type === 'motion' ? { motionType: motionType ?? 'jog' } : {}),
  }
}

export function getSortedChain(
  chains: PlayerActionChains,
  playerId: PlayerLabel,
): PlayerAction[] {
  return [...(chains[playerId] ?? [])].sort((left, right) => left.order - right.order)
}

export function getActionStartPosition(
  playerPosition: Position,
  chain: PlayerAction[],
  actionIndex: number,
): Position {
  if (actionIndex <= 0) {
    return playerPosition
  }

  return getActionEndpoint(playerPosition, chain, actionIndex - 1)
}

export function getActionEndpoint(
  playerPosition: Position,
  chain: PlayerAction[],
  actionIndex: number,
): Position {
  const action = chain[actionIndex]
  if (!action) {
    return playerPosition
  }

  if (action.points.length === 0) {
    return getActionStartPosition(playerPosition, chain, actionIndex)
  }

  return action.points[action.points.length - 1]
}

export function getChainEndpoint(
  playerPosition: Position,
  chain: PlayerAction[],
): Position {
  if (chain.length === 0) {
    return playerPosition
  }

  return getActionEndpoint(playerPosition, chain, chain.length - 1)
}

export function findActionInChain(
  chains: PlayerActionChains,
  playerId: PlayerLabel,
  actionId: string,
): PlayerAction | null {
  return getSortedChain(chains, playerId).find((action) => action.id === actionId) ?? null
}

export function migrateLegacyToPlayerActions(
  routes: Route[],
  blocks: Block[],
  motions: Motion[],
): PlayerActionChains {
  const chains = createEmptyPlayerActionChains()
  const playerIds = new Set<PlayerLabel>()

  for (const route of routes) {
    playerIds.add(route.playerId)
  }
  for (const block of blocks) {
    playerIds.add(block.playerId)
  }
  for (const motion of motions) {
    playerIds.add(motion.playerId)
  }

  for (const playerId of playerIds) {
    const actions: PlayerAction[] = []
    let order = 0

    const motion = motions.find((entry) => entry.playerId === playerId && entry.points.length > 0)
    const block = blocks.find((entry) => entry.playerId === playerId && entry.points.length > 0)
    const route = routes.find((entry) => entry.playerId === playerId && entry.points.length > 0)

    if (motion) {
      actions.push({
        id: crypto.randomUUID(),
        type: 'motion',
        points: [...motion.points],
        endpointMarker: 'filled-circle',
        order: order++,
        motionType: motion.motionType,
      })
    }

    if (block) {
      actions.push({
        id: crypto.randomUUID(),
        type: 'block',
        points: [...block.points],
        endpointMarker: 'blocking-line',
        order,
      })
      order += 1
    }

    if (route) {
      actions.push({
        id: crypto.randomUUID(),
        type: 'route',
        points: [...route.points],
        endpointMarker: 'arrow',
        order,
      })
    }

    if (actions.length > 0) {
      chains[playerId] = actions
    }
  }

  return chains
}

export function flattenPlayerActionsToLegacy(chains: PlayerActionChains): {
  routes: Route[]
  blocks: Block[]
  motions: Motion[]
} {
  const routes: Route[] = []
  const blocks: Block[] = []
  const motions: Motion[] = []

  for (const playerId of Object.keys(chains) as PlayerLabel[]) {
    for (const action of getSortedChain(chains, playerId)) {
      if (action.points.length === 0) {
        continue
      }

      if (action.type === 'route') {
        routes.push({ playerId, points: [...action.points] })
      } else if (action.type === 'block') {
        blocks.push({ playerId, points: [...action.points] })
      } else if (action.type === 'motion') {
        motions.push({
          playerId,
          points: [...action.points],
          motionType: action.motionType ?? 'jog',
        })
      }
    }
  }

  return { routes, blocks, motions }
}

export function upsertPlayerAction(
  chains: PlayerActionChains,
  playerId: PlayerLabel,
  action: PlayerAction,
): PlayerActionChains {
  const chain = getSortedChain(chains, playerId)
  const existingIndex = chain.findIndex((entry) => entry.id === action.id)

  let nextChain: PlayerAction[]
  if (action.points.length === 0) {
    nextChain = chain.filter((entry) => entry.id !== action.id)
  } else if (existingIndex >= 0) {
    nextChain = chain.map((entry) => (entry.id === action.id ? action : entry))
  } else {
    nextChain = [...chain, { ...action, order: chain.length }]
  }

  nextChain = nextChain.map((entry, index) => ({ ...entry, order: index }))

  if (nextChain.length === 0) {
    const { [playerId]: _removed, ...rest } = chains
    return rest
  }

  return {
    ...chains,
    [playerId]: nextChain,
  }
}

function normalizePlayerAction(action: PlayerAction): PlayerAction {
  return {
    ...action,
    endpointMarker: action.endpointMarker ?? defaultEndpointMarker(action.type),
  }
}

function normalizePlayerActionChains(chains: PlayerActionChains): PlayerActionChains {
  const normalized = createEmptyPlayerActionChains()

  for (const playerId of Object.keys(chains) as PlayerLabel[]) {
    normalized[playerId] = (chains[playerId] ?? []).map(normalizePlayerAction)
  }

  return normalized
}

export function hasPlayerActionChainData(chains: PlayerActionChains): boolean {
  for (const playerId of Object.keys(chains) as PlayerLabel[]) {
    for (const action of chains[playerId] ?? []) {
      if (action.points.length > 0) {
        return true
      }
    }
  }

  return false
}

function hasLegacyActionData(
  play: Pick<Play, 'routes' | 'blocks' | 'motions'>,
): boolean {
  return (
    play.routes.some((route) => route.points.length > 0) ||
    play.blocks.some((block) => block.points.length > 0) ||
    (play.motions ?? []).some((motion) => motion.points.length > 0)
  )
}

export function ensurePlayPlayerActions(play: Play): Play {
  const storedChains = play.playerActions ?? {}
  const rawChains = hasPlayerActionChainData(storedChains)
    ? storedChains
    : hasLegacyActionData(play)
      ? migrateLegacyToPlayerActions(play.routes, play.blocks, play.motions ?? [])
      : storedChains
  const chains = normalizePlayerActionChains(rawChains)

  const legacy = flattenPlayerActionsToLegacy(chains)

  return {
    ...play,
    playerActions: chains,
    routes: legacy.routes,
    blocks: legacy.blocks,
    motions: legacy.motions,
  }
}

export function migratePlayerActionChainPoints(
  chains: PlayerActionChains,
  migratePoint: (position: Position) => Position,
): PlayerActionChains {
  const migrated = createEmptyPlayerActionChains()

  for (const playerId of Object.keys(chains) as PlayerLabel[]) {
    migrated[playerId] = (chains[playerId] ?? []).map((action) => ({
      ...action,
      points: action.points.map(migratePoint),
    }))
  }

  return migrated
}

export function mirrorPlayerActionChains(
  chains: PlayerActionChains,
  centerX: number,
): PlayerActionChains {
  const mirrored = createEmptyPlayerActionChains()

  for (const playerId of Object.keys(chains) as PlayerLabel[]) {
    const partner = getMirrorPartner(playerId)
    mirrored[partner] = getSortedChain(chains, playerId).map((action) => ({
      ...action,
      points: action.points.map((point) => mirrorPositionLaterally(point, centerX)),
    }))
  }

  return mirrored
}

export function deleteEntirePlayerAction(
  chains: PlayerActionChains,
  playerId: PlayerLabel,
  actionId: string,
): PlayerActionChains {
  const action = findActionInChain(chains, playerId, actionId)
  if (!action) {
    return chains
  }

  return upsertPlayerAction(chains, playerId, { ...action, points: [] })
}
