import type { ArchivedFormation, ArchivedPlay, ArchivedAssetGroup } from '../types/archivedAsset'
import { TEAM_FORMAT_OPTIONS, normalizeTeamFormat, type TeamFormat } from '../types/teamFormat'

export function teamFormatLabel(format: TeamFormat): string {
  return TEAM_FORMAT_OPTIONS.find((option) => option.value === format)?.label ?? format
}

export function formatMismatchMessage(
  assetFormat: TeamFormat,
  currentFormat: TeamFormat,
): string {
  return `This was created for ${teamFormatLabel(assetFormat)} and cannot be imported into a ${teamFormatLabel(currentFormat)} team.`
}

export function isFormatCompatible(assetFormat: TeamFormat, currentFormat: TeamFormat): boolean {
  return normalizeTeamFormat(assetFormat) === normalizeTeamFormat(currentFormat)
}

function groupKey(archiveId: string): string {
  return archiveId
}

export function groupArchivedPlays(plays: ArchivedPlay[]): ArchivedAssetGroup<ArchivedPlay>[] {
  const map = new Map<string, ArchivedAssetGroup<ArchivedPlay>>()

  for (const play of plays) {
    const key = groupKey(play.archiveId)
    const existing = map.get(key)
    if (existing) {
      existing.items.push(play)
      continue
    }

    map.set(key, {
      originalTeamName: play.originalTeamName,
      teamFormat: play.teamFormat,
      archivedAt: play.archivedAt,
      items: [play],
    })
  }

  for (const group of map.values()) {
    group.items.sort((a, b) => a.name.localeCompare(b.name))
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime(),
  )
}

export function groupArchivedFormations(
  formations: ArchivedFormation[],
): ArchivedAssetGroup<ArchivedFormation>[] {
  const map = new Map<string, ArchivedAssetGroup<ArchivedFormation>>()

  for (const formation of formations) {
    const key = groupKey(formation.archiveId)
    const existing = map.get(key)
    if (existing) {
      existing.items.push(formation)
      continue
    }

    map.set(key, {
      originalTeamName: formation.originalTeamName,
      teamFormat: formation.teamFormat,
      archivedAt: formation.archivedAt,
      items: [formation],
    })
  }

  for (const group of map.values()) {
    group.items.sort((a, b) => a.name.localeCompare(b.name))
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime(),
  )
}

export function formatArchivedDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
