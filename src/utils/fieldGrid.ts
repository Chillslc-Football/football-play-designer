export const FIELD_GRID_STORAGE_KEY = 'football-play-designer-field-grid'

export function loadFieldGrid(): boolean {
  try {
    const raw = localStorage.getItem(FIELD_GRID_STORAGE_KEY)
    return raw === '1' || raw === 'true'
  } catch {
    return false
  }
}

export function saveFieldGrid(enabled: boolean): void {
  try {
    localStorage.setItem(FIELD_GRID_STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // ignore storage errors
  }
}
