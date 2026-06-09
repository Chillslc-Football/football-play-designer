import type { Play } from '../types/play'
import { getCustomFormations } from './formationStorage'
import { normalizePlayRecord, type LegacyPlay } from './playNormalize'

/**
 * localStorage key for all saved plays.
 * The value is a JSON array of Play objects.
 */
export const STORAGE_KEY = 'football-play-designer-plays'

export function normalizePlayName(name: string): string {
  return name.trim() || 'Untitled Play'
}

/** Migrates older saves (formation, fieldPosition) into the current Play shape. */
function normalizePlay(play: LegacyPlay): Play {
  return normalizePlayRecord(play, getCustomFormations())
}

export function getAllSavedPlays(): Play[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as LegacyPlay[]
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizePlay)
  } catch {
    return []
  }
}

function writePlays(plays: Play[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plays))
}

export function findSavedPlayByName(name: string, plays?: Play[]): Play | undefined {
  const list = plays ?? getAllSavedPlays()
  const target = normalizePlayName(name).toLowerCase()
  return list.find((saved) => normalizePlayName(saved.name).toLowerCase() === target)
}

export function upsertPlayById(play: Play, id: string): Play {
  const playToSave: Play = {
    ...play,
    id,
    name: normalizePlayName(play.name),
  }

  const plays = getAllSavedPlays()
  const index = plays.findIndex((saved) => saved.id === id)

  if (index >= 0) {
    plays[index] = playToSave
  } else {
    plays.push(playToSave)
  }

  writePlays(plays)
  return playToSave
}

export function addNewPlay(play: Play): Play {
  const newPlay: Play = {
    ...play,
    id: crypto.randomUUID(),
    name: normalizePlayName(play.name),
  }

  const plays = getAllSavedPlays()
  plays.push(newPlay)
  writePlays(plays)
  return newPlay
}

export function getPlayById(playId: string): Play | null {
  const play = getAllSavedPlays().find((saved) => saved.id === playId)
  return play ? normalizePlay(play) : null
}

export function deletePlayFromStorage(playId: string): void {
  const plays = getAllSavedPlays().filter((saved) => saved.id !== playId)
  writePlays(plays)
}

export function removeCategoryFromAllPlays(categoryName: string): Play[] {
  const plays = getAllSavedPlays().map((saved) => ({
    ...saved,
    categories: saved.categories.filter((category) => category !== categoryName),
  }))
  writePlays(plays)
  return plays
}
