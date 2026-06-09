import type { Play } from '../types/play'
import { getCustomFormations } from './formationStorage'
import { renderPlayToDbPlay } from './positionCoordinates'
import { normalizePlayRecord, type LegacyPlay } from './playNormalize'

/**
 * localStorage key for all saved plays.
 * The value is a JSON array of Play objects.
 */
export const STORAGE_KEY = 'football-play-designer-plays'

export function normalizePlayName(name: string): string {
  return name.trim() || 'Untitled Play'
}

function readRawPlays(): LegacyPlay[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as LegacyPlay[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/** Migrates older saves (formation, fieldPosition) into the current Play shape. */
function normalizePlay(play: LegacyPlay): Play {
  return normalizePlayRecord(play, getCustomFormations())
}

function writeStoredPlays(renderPlays: Play[]): void {
  const stored = renderPlays.map((play) => renderPlayToDbPlay(play))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
}

export function getAllSavedPlays(): Play[] {
  return readRawPlays().map(normalizePlay)
}

export function findSavedPlayByName(name: string, plays?: Play[]): Play | undefined {
  const list = plays ?? getAllSavedPlays()
  const target = normalizePlayName(name).toLowerCase()
  return list.find((saved) => normalizePlayName(saved.name).toLowerCase() === target)
}

export function upsertPlayById(play: Play, id: string): Play {
  const runtimePlay: Play = {
    ...play,
    id,
    name: normalizePlayName(play.name),
  }

  const runtimePlays = getAllSavedPlays()
  const index = runtimePlays.findIndex((saved) => saved.id === id)

  if (index >= 0) {
    runtimePlays[index] = runtimePlay
  } else {
    runtimePlays.push(runtimePlay)
  }

  writeStoredPlays(runtimePlays)
  return runtimePlay
}

export function addNewPlay(play: Play): Play {
  const runtimePlay: Play = {
    ...play,
    id: crypto.randomUUID(),
    name: normalizePlayName(play.name),
  }

  const runtimePlays = getAllSavedPlays()
  runtimePlays.push(runtimePlay)
  writeStoredPlays(runtimePlays)
  return runtimePlay
}

export function getPlayById(playId: string): Play | null {
  const raw = readRawPlays().find((saved) => saved.id === playId)
  return raw ? normalizePlay(raw) : null
}

export function deletePlayFromStorage(playId: string): void {
  const runtimePlays = getAllSavedPlays().filter((saved) => saved.id !== playId)
  writeStoredPlays(runtimePlays)
}

export function removeCategoryFromAllPlays(categoryName: string): Play[] {
  const runtimePlays = getAllSavedPlays().map((saved) => ({
    ...saved,
    categories: saved.categories.filter((category) => category !== categoryName),
  }))
  writeStoredPlays(runtimePlays)
  return runtimePlays
}
