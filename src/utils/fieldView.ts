import {
  FIELD_VIEW_LENGTH,
  FIELD_WIDTH,
  HASH_MARK_LANES,
  LEGACY_LOS_X,
  LOS_VIEW_X,
  LOS_VIEW_Y,
} from '../constants/field'
import type { DriveStartYardLine } from '../types/driveStart'
import { getLosYardForDriveStart } from '../types/driveStart'
import type { Play } from '../types/play'
import type { Player, Position } from '../types/player'

export type FieldViewBounds = {
  losYard: number
  viewStartYard: number
  viewEndYard: number
  losViewY: number
}

export type YardLine = {
  viewY: number
  isMajor: boolean
}

export type YardLabel = {
  viewY: number
  absoluteYard: number
  label: string
}

/**
 * Maps an absolute field yard (0–100) into view Y coordinates.
 *
 * The 50-yard window scrolls with drive start: view Y = 0 is the north edge of
 * the visible field at absolute yard `viewStartYard`. Sideline labels, yard
 * lines, and the line of scrimmage all use this same formula.
 */
export function absoluteYardToViewY(absoluteYard: number, viewStartYard: number): number {
  return absoluteYard - viewStartYard
}

export function getFieldViewBounds(driveStart: DriveStartYardLine): FieldViewBounds {
  const losYard = getLosYardForDriveStart(driveStart)
  // Keep LOS at a fixed view Y (12 yards of backfield south) while the window scrolls.
  const viewStartYard = losYard - LOS_VIEW_Y

  return {
    losYard,
    viewStartYard,
    viewEndYard: viewStartYard + FIELD_VIEW_LENGTH,
    // Same coordinate system as yard lines and sideline numbers.
    losViewY: absoluteYardToViewY(losYard, viewStartYard),
  }
}

/** Football-style yard number for an absolute field position (0–100). */
export function formatAbsoluteYardLabel(absoluteYard: number): string | null {
  if (absoluteYard <= 0 || absoluteYard >= 100) return null
  if (absoluteYard === 50) return '50'
  if (absoluteYard < 50) return String(absoluteYard)
  return String(100 - absoluteYard)
}

function isInsideViewBox(viewY: number): boolean {
  return viewY > 0 && viewY < FIELD_VIEW_LENGTH
}

/** Horizontal yard lines every 5 absolute yards visible in the current drive-start window. */
export function getYardLines(bounds: FieldViewBounds): YardLine[] {
  const lines: YardLine[] = []
  const { viewStartYard } = bounds
  const viewEndYard = viewStartYard + FIELD_VIEW_LENGTH

  for (let absoluteYard = 5; absoluteYard <= viewEndYard; absoluteYard += 5) {
    if (absoluteYard <= viewStartYard) continue

    const viewY = absoluteYardToViewY(absoluteYard, viewStartYard)
    if (!isInsideViewBox(viewY)) continue

    lines.push({
      viewY,
      isMajor: absoluteYard % 10 === 0,
    })
  }

  return lines
}

/** Major yard labels every 10 yards within the visible window for the drive start. */
export function getMajorYardLabels(bounds: FieldViewBounds): YardLabel[] {
  const labels: YardLabel[] = []
  const { viewStartYard } = bounds
  const viewEndYard = viewStartYard + FIELD_VIEW_LENGTH

  for (let absoluteYard = 10; absoluteYard <= 90; absoluteYard += 10) {
    if (absoluteYard < viewStartYard || absoluteYard > viewEndYard) continue

    const viewY = absoluteYardToViewY(absoluteYard, viewStartYard)
    if (!isInsideViewBox(viewY)) continue

    const label = formatAbsoluteYardLabel(absoluteYard)
    if (!label) continue

    labels.push({ viewY, absoluteYard, label })
  }

  return labels
}

export type HashMark = {
  viewY: number
  x: number
}

/** Small hash ticks between yard lines at each hash lane (playbook style). */
export function getHashMarks(): HashMark[] {
  const marks: HashMark[] = []

  for (let viewY = 1; viewY < FIELD_VIEW_LENGTH; viewY += 1) {
    if (viewY % 5 === 0) continue

    for (const x of HASH_MARK_LANES) {
      marks.push({ viewY, x })
    }
  }

  return marks
}

export function clampViewPosition(position: Position): Position {
  return {
    x: Math.min(FIELD_WIDTH - 0.5, Math.max(0.5, position.x)),
    y: Math.min(FIELD_VIEW_LENGTH - 0.5, Math.max(0.5, position.y)),
  }
}

function usesLegacyCoordinates(
  play: Pick<Play, 'players' | 'routes' | 'blocks' | 'motions'>,
): boolean {
  const xs = [
    ...play.players.map((player) => player.position.x),
    ...play.routes.flatMap((route) => route.points.map((point) => point.x)),
    ...play.blocks.flatMap((block) => block.points.map((point) => point.x)),
    ...(play.motions ?? []).flatMap((motion) => motion.points.map((point) => point.x)),
  ]

  if (xs.length === 0) return false
  return Math.max(...xs) > FIELD_VIEW_LENGTH + 2
}

function shiftLegacyPosition(position: Position): Position {
  const shiftX = LEGACY_LOS_X - LOS_VIEW_X
  return clampViewPosition({
    x: position.x - shiftX,
    y: position.y,
  })
}

function usesHorizontalOrientation(players: Player[]): boolean {
  const center = players.find((player) => player.id === 'C')
  if (!center) return false

  const yNearWidthCenter = Math.abs(center.position.y - FIELD_WIDTH / 2) < 18
  const xNearWidthCenter = Math.abs(center.position.x - FIELD_WIDTH / 2) < 12
  const yNearLos = Math.abs(center.position.y - LOS_VIEW_Y) < 4

  // Portrait: center on LOS with x at field width center — already correct, do not flip.
  if (xNearWidthCenter && yNearLos) return false

  // Horizontal legacy: center on width centerline with small x (attack left-to-right).
  return yNearWidthCenter && center.position.x < LOS_VIEW_Y && !xNearWidthCenter
}

function usesHorizontalFormation(positions: Record<string, Position>): boolean {
  const center = positions.C
  if (!center) return false

  const yNearWidthCenter = Math.abs(center.y - FIELD_WIDTH / 2) < 18
  const xNearWidthCenter = Math.abs(center.x - FIELD_WIDTH / 2) < 12
  const yNearLos = Math.abs(center.y - LOS_VIEW_Y) < 4

  if (xNearWidthCenter && yNearLos) return false

  return yNearWidthCenter && center.x < LOS_VIEW_Y && !xNearWidthCenter
}

/** Converts left-to-right attack coordinates into north/south portrait coordinates. */
export function convertHorizontalToPortrait(position: Position): Position {
  return clampViewPosition({
    x: position.y,
    y: FIELD_VIEW_LENGTH - position.x,
  })
}

function migratePaths<T extends { points: Position[] }>(paths: T[]): T[] {
  return paths.map((path) => ({
    ...path,
    points: path.points.map(shiftLegacyPosition),
  }))
}

function migratePathsToPortrait<T extends { points: Position[] }>(paths: T[]): T[] {
  return paths.map((path) => ({
    ...path,
    points: path.points.map(convertHorizontalToPortrait),
  }))
}

function migratePlayToPortrait(play: Play): Play {
  return {
    ...play,
    players: play.players.map((player) => ({
      ...player,
      position: convertHorizontalToPortrait(player.position),
    })),
    defenders: play.defenders.map((defender) => ({
      ...defender,
      position: convertHorizontalToPortrait(defender.position),
    })),
    routes: migratePathsToPortrait(play.routes),
    blocks: migratePathsToPortrait(play.blocks),
    motions: migratePathsToPortrait(play.motions ?? []),
  }
}

/** Shifts coordinates from the old 120-unit full field into the 50-yard LOS view. */
export function migratePlayToFieldView(play: Play): Play {
  let migrated: Play = play

  if (usesLegacyCoordinates(migrated)) {
    migrated = {
      ...migrated,
      players: migrated.players.map((player) => ({
        ...player,
        position: shiftLegacyPosition(player.position),
      })),
      defenders: migrated.defenders.map((defender) => ({
        ...defender,
        position: shiftLegacyPosition(defender.position),
      })),
      routes: migratePaths(migrated.routes),
      blocks: migratePaths(migrated.blocks),
      motions: migratePaths(migrated.motions ?? []),
    }
  }

  if (usesHorizontalOrientation(migrated.players)) {
    migrated = migratePlayToPortrait(migrated)
  }

  return migrated
}

export function migrateFormationPositions(
  positions: Record<string, Position>,
): Record<string, Position> {
  const xs = Object.values(positions).map((position) => position.x)
  let migrated = positions

  if (xs.length > 0 && Math.max(...xs) > FIELD_VIEW_LENGTH + 2) {
    migrated = Object.fromEntries(
      Object.entries(positions).map(([label, position]) => [
        label,
        shiftLegacyPosition(position),
      ]),
    ) as Record<string, Position>
  }

  if (usesHorizontalFormation(migrated)) {
    migrated = Object.fromEntries(
      Object.entries(migrated).map(([label, position]) => [
        label,
        convertHorizontalToPortrait(position),
      ]),
    ) as Record<string, Position>
  }

  return migrated
}
