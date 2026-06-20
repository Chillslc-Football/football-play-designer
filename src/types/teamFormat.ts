export type TeamFormat = '11v11' | '8v8' | '7v7'

export const DEFAULT_TEAM_FORMAT: TeamFormat = '11v11'

export const TEAM_FORMAT_OPTIONS: { value: TeamFormat; label: string }[] = [
  { value: '11v11', label: '11v11 (standard)' },
  { value: '8v8', label: '8v8' },
  { value: '7v7', label: '7v7' },
]

export function normalizeTeamFormat(value: string | null | undefined): TeamFormat {
  if (value === '8v8' || value === '7v7') {
    return value
  }
  return DEFAULT_TEAM_FORMAT
}

export function getPlayerCountForFormat(format: TeamFormat): number {
  switch (format) {
    case '7v7':
      return 7
    case '8v8':
      return 8
    default:
      return 11
  }
}

/** Central player-count helper for team format. */
export function getTeamPlayerCount(format: TeamFormat): number {
  return getPlayerCountForFormat(format)
}

export function enforcesBackfieldLimit(format: TeamFormat): boolean {
  return format === '11v11'
}
