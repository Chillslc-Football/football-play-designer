import type { Play } from '../types/play'

export type PlayLibraryLayout = 1 | 2 | 3 | 4 | 5

export type PlayLibraryFilter = 'offense' | 'defense' | 'both'

export const PLAY_LIBRARY_LAYOUTS: PlayLibraryLayout[] = [1, 2, 3, 4, 5]

export const DEFAULT_PLAY_LIBRARY_LAYOUT: PlayLibraryLayout = 3

export const DEFAULT_PLAY_LIBRARY_FILTER: PlayLibraryFilter = 'both'

export type PlayLibrarySection = {
  title: string
  plays: Play[]
}

export function sortPlaysByName(plays: Play[]): Play[] {
  return [...plays].sort((left, right) => left.name.localeCompare(right.name))
}

export function filterLibraryPlays(plays: Play[], filter: PlayLibraryFilter): Play[] {
  const offensive = sortPlaysByName(plays.filter((play) => play.playType === 'offensive'))
  const defensive = sortPlaysByName(plays.filter((play) => play.playType === 'defensive'))

  if (filter === 'offense') return offensive
  if (filter === 'defense') return defensive
  return [...offensive, ...defensive]
}

export function groupLibraryPlays(plays: Play[], filter: PlayLibraryFilter): PlayLibrarySection[] {
  const offensive = sortPlaysByName(plays.filter((play) => play.playType === 'offensive'))
  const defensive = sortPlaysByName(plays.filter((play) => play.playType === 'defensive'))

  if (filter === 'offense') {
    return offensive.length > 0 ? [{ title: 'Offensive Plays', plays: offensive }] : []
  }

  if (filter === 'defense') {
    return defensive.length > 0 ? [{ title: 'Defensive Plays', plays: defensive }] : []
  }

  const sections: PlayLibrarySection[] = []
  if (offensive.length > 0) {
    sections.push({ title: 'Offensive Plays', plays: offensive })
  }
  if (defensive.length > 0) {
    sections.push({ title: 'Defensive Plays', plays: defensive })
  }
  return sections
}

export function playsPerLibraryPage(layout: PlayLibraryLayout): number {
  return layout * layout
}

export function paginatePlays(plays: Play[], layout: PlayLibraryLayout): Play[][] {
  const pageSize = playsPerLibraryPage(layout)
  if (pageSize <= 0 || plays.length === 0) {
    return plays.length === 0 ? [] : [plays]
  }

  const pages: Play[][] = []
  for (let index = 0; index < plays.length; index += pageSize) {
    pages.push(plays.slice(index, index + pageSize))
  }
  return pages
}
