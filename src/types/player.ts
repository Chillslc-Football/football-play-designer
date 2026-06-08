import { clampViewPosition } from '../utils/fieldView'

/** A point on the field in SVG coordinates (x = lateral, y = depth; offense attacks upward). */
export type Position = {
  x: number
  y: number
}

/** The 11 offensive positions we support. */
export type PlayerLabel =
  | 'QB'
  | 'RB'
  | 'FB'
  | 'X'
  | 'Y'
  | 'Z'
  | 'LT'
  | 'LG'
  | 'C'
  | 'RG'
  | 'RT'

export type Player = {
  id: PlayerLabel
  label: PlayerLabel
  position: Position
}

/** Keeps a player inside the 50-yard view boundaries. */
export function clampPosition(position: Position): Position {
  return clampViewPosition(position)
}
