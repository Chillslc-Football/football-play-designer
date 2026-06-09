import { DEFAULT_CATEGORIES } from '../data/defaultCategories'

export const ALL_CATEGORIES_FILTER = 'all'

export type CategoryFilterId = typeof ALL_CATEGORIES_FILTER | string

const defaultCategorySet = new Set<string>(DEFAULT_CATEGORIES)

export function normalizeCategories(categories: unknown): string[] {
  if (!Array.isArray(categories)) return []

  const normalized = categories
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return [...new Set(normalized)]
}

export function isDefaultCategory(name: string): boolean {
  return defaultCategorySet.has(name)
}

export function getAvailableCategories(
  customCategories: string[],
  savedPlays: { categories: string[] }[] = [],
): string[] {
  const fromPlays = savedPlays.flatMap((play) => play.categories)
  const merged = [...DEFAULT_CATEGORIES, ...customCategories, ...fromPlays]
  const unique = [...new Set(merged.map((name) => name.trim()).filter(Boolean))]

  return unique.sort((a, b) => {
    const aDefault = isDefaultCategory(a)
    const bDefault = isDefaultCategory(b)
    if (aDefault !== bDefault) return aDefault ? -1 : 1
    return a.localeCompare(b)
  })
}

export function getCategoryFilterOptions(
  customCategories: string[],
  savedPlays: { categories: string[] }[] = [],
): { id: CategoryFilterId; label: string; group: 'all' | 'default' | 'custom' }[] {
  const customOnly = getAvailableCategories(customCategories, savedPlays).filter(
    (name) => !isDefaultCategory(name),
  )

  return [
    { id: ALL_CATEGORIES_FILTER, label: 'All Categories', group: 'all' },
    ...DEFAULT_CATEGORIES.map((name) => ({
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

export function filterPlaysByFormationAndCategory<
  T extends { formationId: string; categories: string[] },
>(
  plays: T[],
  formationFilterId: string,
  categoryFilterId: CategoryFilterId,
  formationFilterFn: (list: T[], formationId: string) => T[],
): T[] {
  const byFormation = formationFilterFn(plays, formationFilterId)
  return filterPlaysByCategory(byFormation, categoryFilterId)
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

export function isCategoryNameTaken(name: string, existingCustom: string[]): boolean {
  const normalized = name.trim().toLowerCase()
  if (!normalized) return true

  if (DEFAULT_CATEGORIES.some((category) => category.toLowerCase() === normalized)) {
    return true
  }

  return existingCustom.some((category) => category.toLowerCase() === normalized)
}
