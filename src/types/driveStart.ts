/** Drive start yard line — the line of scrimmage for the current play. */
export type DriveStartYardLine =
  | 'own-1'
  | 'own-5'
  | 'own-10'
  | 'own-20'
  | 'own-25'
  | 'own-30'
  | 'own-35'
  | 'own-40'
  | 'own-45'
  | '50'
  | 'opp-45'
  | 'opp-40'
  | 'opp-35'
  | 'opp-30'
  | 'opp-25'
  | 'opp-20'
  | 'opp-15'
  | 'opp-10'
  | 'opp-5'
  | 'goal-line'

export type DriveStartOption = {
  id: DriveStartYardLine
  label: string
  /** Absolute yard from the offense's own goal line (1–99). */
  losYard: number
}

export const DRIVE_START_OPTIONS: DriveStartOption[] = [
  { id: 'own-1', label: 'Opp 1', losYard: 1 },
  { id: 'own-5', label: 'Opp 5', losYard: 5 },
  { id: 'own-10', label: 'Opp 10', losYard: 10 },
  { id: 'own-20', label: 'Opp 20', losYard: 20 },
  { id: 'own-25', label: 'Opp 25', losYard: 25 },
  { id: 'own-30', label: 'Opp 30', losYard: 30 },
  { id: 'own-35', label: 'Opp 35', losYard: 35 },
  { id: 'own-40', label: 'Opp 40', losYard: 40 },
  { id: 'own-45', label: 'Opp 45', losYard: 45 },
  { id: '50', label: '50', losYard: 50 },
  { id: 'opp-45', label: 'Own 45', losYard: 55 },
  { id: 'opp-40', label: 'Own 40', losYard: 60 },
  { id: 'opp-35', label: 'Own 35', losYard: 65 },
  { id: 'opp-30', label: 'Own 30', losYard: 70 },
  { id: 'opp-25', label: 'Own 25', losYard: 75 },
  { id: 'opp-20', label: 'Own 20', losYard: 80 },
  { id: 'opp-15', label: 'Own 15', losYard: 85 },
  { id: 'opp-10', label: 'Own 10', losYard: 90 },
  { id: 'opp-5', label: 'Own 5', losYard: 95 },
  { id: 'goal-line', label: 'Goal Line', losYard: 99 },
]

export const DEFAULT_DRIVE_START: DriveStartYardLine = '50'

const LOS_YARD_BY_ID = Object.fromEntries(
  DRIVE_START_OPTIONS.map((option) => [option.id, option.losYard]),
) as Record<DriveStartYardLine, number>

/** Legacy fieldPosition ids from older saves. */
const LEGACY_FIELD_POSITION_MAP: Record<string, DriveStartYardLine> = {
  'middle-of-field': '50',
  'own-goal-line': 'own-1',
  'backed-up': 'own-5',
  'red-zone': 'opp-20',
  'goal-line': 'goal-line',
}

export function getLosYardForDriveStart(driveStart: DriveStartYardLine): number {
  return LOS_YARD_BY_ID[driveStart] ?? 50
}

export function getDriveStartLabel(driveStart: DriveStartYardLine): string {
  return (
    DRIVE_START_OPTIONS.find((option) => option.id === driveStart)?.label ?? '50'
  )
}

export function resolveDriveStartYardLine(
  play: { driveStartYardLine?: DriveStartYardLine; fieldPosition?: string },
): DriveStartYardLine {
  if (play.driveStartYardLine) {
    return play.driveStartYardLine
  }

  if (play.fieldPosition && LEGACY_FIELD_POSITION_MAP[play.fieldPosition]) {
    return LEGACY_FIELD_POSITION_MAP[play.fieldPosition]
  }

  return DEFAULT_DRIVE_START
}
