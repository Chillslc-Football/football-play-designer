import type { TeamFormat } from './teamFormat'

export type ArchivedPlay = {
  id: string
  archiveId: string
  originalId: string
  originalTeamId: string
  originalTeamName: string
  teamFormat: TeamFormat
  archivedAt: string
  name: string
  playType: string
}

export type ArchivedFormation = {
  id: string
  archiveId: string
  originalId: string
  originalTeamId: string
  originalTeamName: string
  teamFormat: TeamFormat
  archivedAt: string
  name: string
}

export type ArchivedAssetGroup<T extends ArchivedPlay | ArchivedFormation> = {
  originalTeamName: string
  teamFormat: TeamFormat
  archivedAt: string
  items: T[]
}
