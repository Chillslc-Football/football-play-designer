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
  /** Fixed formation slot key — never changes. */
  id: PlayerLabel
  /** Coach-defined position label (max 3 chars); falls back to id when unset. */
  label: string
  position: Position
}

/** Trim, uppercase, and cap custom position labels at 3 characters. */
export function normalizePositionLabel(value: string): string {
  return value.trim().toUpperCase().slice(0, 3)
}

/** Display label for a slot: custom value when provided, otherwise the default slot id. */
export function resolvePlayerDisplayLabel(
  id: PlayerLabel,
  customLabel?: string | null,
): string {
  if (customLabel === undefined || customLabel === null) {
    return id
  }
  return normalizePositionLabel(customLabel)
}

/** Keeps a player inside the 50-yard view boundaries. */
export function clampPosition(position: Position): Position {
  return clampViewPosition(position)
}
