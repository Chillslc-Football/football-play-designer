const CUSTOM_CATEGORIES_KEY = 'football-play-designer-custom-categories'

type CategoryStore = Record<string, string[]>

function readStore(): CategoryStore {
  const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as CategoryStore
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStore(store: CategoryStore): void {
  localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(store))
}

function storageKey(teamId: string | null): string {
  return teamId ?? 'local'
}

export function getCustomCategories(teamId: string | null): string[] {
  const store = readStore()
  const list = store[storageKey(teamId)] ?? []
  return [...new Set(list.map((name) => name.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )
}

export function addCustomCategory(teamId: string | null, name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return getCustomCategories(teamId)

  const key = storageKey(teamId)
  const store = readStore()
  const current = store[key] ?? []

  if (current.some((entry) => entry.toLowerCase() === trimmed.toLowerCase())) {
    return getCustomCategories(teamId)
  }

  store[key] = [...current, trimmed].sort((a, b) => a.localeCompare(b))
  writeStore(store)
  return store[key]
}

export function deleteCustomCategory(teamId: string | null, name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return getCustomCategories(teamId)

  const key = storageKey(teamId)
  const store = readStore()
  store[key] = (store[key] ?? []).filter(
    (entry) => entry.toLowerCase() !== trimmed.toLowerCase(),
  )
  writeStore(store)
  return store[key]
}
