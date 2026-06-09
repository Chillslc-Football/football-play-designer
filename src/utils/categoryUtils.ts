import { DEFAULT_CATEGORIES } from '../data/defaultCategories'
import { DEFAULT_DEFENSIVE_CATEGORIES } from '../data/defaultDefensiveCategories'
import type { PlayType } from '../types/playType'
import type { Play } from '../types/play'

export const ALL_CATEGORIES_FILTER = 'all'

export type CategoryFilterId = typeof ALL_CATEGORIES_FILTER | string

export function getDefaultCategoriesForPlayType(playType: PlayType): readonly string[] {
  return playType === 'defensive' ? DEFAULT_DEFENSIVE_CATEGORIES : DEFAULT_CATEGORIES
}

export function normalizeCategories(categories: unknown): string[] {
  if (!Array.isArray(categories)) return []

  const normalized = categories
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return [...new Set(normalized)]
}

export function isDefaultCategory(name: string, playType: PlayType = 'offensive'): boolean {
  return getDefaultCategoriesForPlayType(playType).includes(name)
}

export function filterPlaysByPlayType(plays: Play[], playType: PlayType): Play[] {
  return plays.filter((play) => play.playType === playType)
}

export function getAvailableCategories(
  playType: PlayType,
  customCategories: string[],
  savedPlays: { categories: string[] }[] = [],
): string[] {
  const defaults = getDefaultCategoriesForPlayType(playType)
  const fromPlays = savedPlays.flatMap((play) => play.categories)
  const merged = [...defaults, ...customCategories, ...fromPlays]
  const unique = [...new Set(merged.map((name) => name.trim()).filter(Boolean))]

  return unique.sort((a, b) => {
    const aDefault = isDefaultCategory(a, playType)
    const bDefault = isDefaultCategory(b, playType)
    if (aDefault !== bDefault) return aDefault ? -1 : 1
    return a.localeCompare(b)
  })
}

export function getCategoryFilterOptions(
  playType: PlayType,
  customCategories: string[],
  savedPlays: { categories: string[] }[] = [],
): { id: CategoryFilterId; label: string; group: 'all' | 'default' | 'custom' }[] {
  const defaults = getDefaultCategoriesForPlayType(playType)
  const customOnly = getAvailableCategories(playType, customCategories, savedPlays).filter(
    (name) => !isDefaultCategory(name, playType),
  )

  return [
    { id: ALL_CATEGORIES_FILTER, label: 'All Categories', group: 'all' },
    ...defaults.map((name) => ({
      id: name,
      label: name,
      group: 'default' as const,
    })),
    ...customOnly.map((name) => ({
      id: name,
      label: name,
      group: 'custom' as const,
    })),
  ]
}

export function filterPlaysByCategory<T extends { categories: string[] }>(
  plays: T[],
  filterId: CategoryFilterId,
): T[] {
  if (filterId === ALL_CATEGORIES_FILTER) return plays
  return plays.filter((play) => play.categories.includes(filterId))
}

export function filterPlaysByFormationAndCategory<T extends { categories: string[] }>(
  plays: T[],
  schemeFilterId: string,
  categoryFilterId: CategoryFilterId,
  schemeFilterFn: (list: T[], schemeId: string) => T[],
): T[] {
  const byScheme = schemeFilterFn(plays, schemeFilterId)
  return filterPlaysByCategory(byScheme, categoryFilterId)
}

export function removeCategoryFromPlay<T extends { categories: string[] }>(
  play: T,
  category: string,
): T {
  return {
    ...play,
    categories: play.categories.filter((entry) => entry !== category),
  }
}

export function isCategoryNameTaken(
  name: string,
  playType: PlayType,
  existingCustom: string[],
): boolean {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return true

  if (
    getDefaultCategoriesForPlayType(playType).some(
      (category) => category.toLowerCase() === normalized,
    )
  ) {
    return true
  }

  return existingCustom.some((category) => category.toLowerCase() === normalized)
}

export function filterCategoriesForPlayType(
  categories: string[],
  playType: PlayType,
): string[] {
  const defaults = new Set(getDefaultCategoriesForPlayType(playType))
  return normalizeCategories(categories).filter((category) => defaults.has(category))
}
