import { FIELD_VIEW_LENGTH, FIELD_WIDTH } from '../constants/field'
import type { Play, PositionFormat } from '../types/play'
import type { PlayerActionChains } from '../types/playerAction'
import type { Position } from '../types/player'

export type NormalizedPosition = {
  x: number
  y: number
}

/** Coordinates used by the field renderer (SVG yards). */
export const COORDINATE_SPACE_RENDER: PositionFormat = 'yard'

/** Coordinates stored in Supabase/localStorage (0–100 field percentages). */
export const COORDINATE_SPACE_DB: PositionFormat = 'normalized'

export function yardToPercent(
  x: number,
  y: number,
  fieldWidth = FIELD_WIDTH,
  fieldHeight = FIELD_VIEW_LENGTH,
): NormalizedPosition {
  return {
    x: (x / fieldWidth) * 100,
    y: (y / fieldHeight) * 100,
  }
}

export function percentToYard(
  x: number,
  y: number,
  fieldWidth = FIELD_WIDTH,
  fieldHeight = FIELD_VIEW_LENGTH,
): Position {
  return {
    x: (x / 100) * fieldWidth,
    y: (y / 100) * fieldHeight,
  }
}

/** Heuristic only — prefer positionFormat flag. Small yard values can also be under 100. */
export function isPercentPosition(position: Position): boolean {
  return (
    position.x >= 0 &&
    position.x <= 100 &&
    position.y >= 0 &&
    position.y <= 100
  )
}

function renderPointToDb(position: Position): NormalizedPosition {
  return yardToPercent(position.x, position.y)
}

function dbPointToRender(position: Position): Position {
  return percentToYard(position.x, position.y)
}

function renderPathToDb(points: Position[]): Position[] {
  return points.map(renderPointToDb)
}

function dbPathToRender(points: Position[]): Position[] {
  return points.map(dbPointToRender)
}

function renderPlayerActionsToDb(chains: PlayerActionChains): PlayerActionChains {
  const converted: PlayerActionChains = {}

  for (const playerId of Object.keys(chains) as Array<keyof PlayerActionChains>) {
    converted[playerId] = (chains[playerId] ?? []).map((action) => ({
      ...action,
      points: renderPathToDb(action.points),
    }))
  }

  return converted
}

function dbPlayerActionsToRender(chains: PlayerActionChains): PlayerActionChains {
  const converted: PlayerActionChains = {}

  for (const playerId of Object.keys(chains) as Array<keyof PlayerActionChains>) {
    converted[playerId] = (chains[playerId] ?? []).map((action) => ({
      ...action,
      points: dbPathToRender(action.points),
    }))
  }

  return converted
}

/**
 * Save boundary: copy render-space play → database-space play.
 * Never mutates the input; skips conversion if already database format.
 */
export function renderPlayToDbPlay(play: Play): Play {
  console.log('SAVE before conversion', {
    positionFormat: play.positionFormat ?? COORDINATE_SPACE_RENDER,
    players: play.players.map((player) => ({ id: player.id, ...player.position })),
    defenders: play.defenders.map((defender) => ({ id: defender.id, ...defender.position })),
  })

  if (play.positionFormat === COORDINATE_SPACE_DB) {
    const copy = { ...play }
    console.log('SAVE payload to Supabase', {
      positionFormat: copy.positionFormat,
      players: copy.players.map((player) => ({ id: player.id, ...player.position })),
      defenders: copy.defenders.map((defender) => ({ id: defender.id, ...defender.position })),
    })
    return copy
  }

  const dbPlay: Play = {
    ...play,
    positionFormat: COORDINATE_SPACE_DB,
    players: play.players.map((player) => ({
      ...player,
      position: renderPointToDb(player.position),
    })),
    defenders: play.defenders.map((defender) => ({
      ...defender,
      position: renderPointToDb(defender.position),
    })),
    routes: play.routes.map((route) => ({
      ...route,
      points: renderPathToDb(route.points),
    })),
    blocks: play.blocks.map((block) => ({
      ...block,
      points: renderPathToDb(block.points),
    })),
    motions: play.motions.map((motion) => ({
      ...motion,
      points: renderPathToDb(motion.points),
    })),
    playerActions: renderPlayerActionsToDb(play.playerActions ?? {}),
    defenderRoutes: play.defenderRoutes.map((route) => ({
      ...route,
      points: renderPathToDb(route.points),
    })),
  }

  console.log('SAVE payload to Supabase', {
    positionFormat: dbPlay.positionFormat,
    players: dbPlay.players.map((player) => ({ id: player.id, ...player.position })),
    defenders: dbPlay.defenders.map((defender) => ({ id: defender.id, ...defender.position })),
  })

  return dbPlay
}

/**
 * Load boundary: copy database-space play → render-space play.
 * Never mutates the input; skips conversion if already render format.
 */
export function dbPlayToRenderPlay(play: Play): Play {
  console.log('LOAD raw from Supabase', {
    positionFormat: play.positionFormat ?? COORDINATE_SPACE_RENDER,
    players: play.players.map((player) => ({ id: player.id, ...player.position })),
    defenders: play.defenders.map((defender) => ({ id: defender.id, ...defender.position })),
  })

  if (play.positionFormat !== COORDINATE_SPACE_DB) {
    const renderPlay: Play = {
      ...play,
      positionFormat: COORDINATE_SPACE_RENDER,
    }
    console.log('LOAD after conversion', {
      positionFormat: renderPlay.positionFormat,
      players: renderPlay.players.map((player) => ({ id: player.id, ...player.position })),
      defenders: renderPlay.defenders.map((defender) => ({ id: defender.id, ...defender.position })),
    })
    return renderPlay
  }

  const renderPlay: Play = {
    ...play,
    positionFormat: COORDINATE_SPACE_RENDER,
    players: play.players.map((player) => ({
      ...player,
      position: dbPointToRender(player.position),
    })),
    defenders: play.defenders.map((defender) => ({
      ...defender,
      position: dbPointToRender(defender.position),
    })),
    routes: play.routes.map((route) => ({
      ...route,
      points: dbPathToRender(route.points),
    })),
    blocks: play.blocks.map((block) => ({
      ...block,
      points: dbPathToRender(block.points),
    })),
    motions: play.motions.map((motion) => ({
      ...motion,
      points: dbPathToRender(motion.points),
    })),
    playerActions: dbPlayerActionsToRender(play.playerActions ?? {}),
    defenderRoutes: play.defenderRoutes.map((route) => ({
      ...route,
      points: dbPathToRender(route.points),
    })),
  }

  console.log('LOAD after conversion', {
    positionFormat: renderPlay.positionFormat,
    players: renderPlay.players.map((player) => ({ id: player.id, ...player.position })),
    defenders: renderPlay.defenders.map((defender) => ({ id: defender.id, ...defender.position })),
  })

  return renderPlay
}

export function hasSavedPlayerPositions(players: Play['players'] | undefined): boolean {
  return (players?.length ?? 0) > 0
}

export function hasSavedDefenderPositions(defenders: Play['defenders'] | undefined): boolean {
  return (defenders?.length ?? 0) > 0
}

/** @deprecated Use renderPlayToDbPlay */
export const normalizePlayPositionsForStorage = renderPlayToDbPlay

/** @deprecated Use dbPlayToRenderPlay */
export const denormalizePlayPositionsFromStorage = dbPlayToRenderPlay
