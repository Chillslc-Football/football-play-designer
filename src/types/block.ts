import type { PlayerLabel, Position } from './player'

/** A blocking assignment drawn for one player — separate from routes. */
export type Block = {
  playerId: PlayerLabel
  points: Position[]
}

export function createEmptyBlocks(): Block[] {
  return []
}
