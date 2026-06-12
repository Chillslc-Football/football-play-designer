export const FIELD_ZOOM_STORAGE_KEY = 'football-play-designer-field-zoom'

export const FIELD_ZOOM_PRESETS = [
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '175%', value: 1.75 },
  { label: '200%', value: 2 },
] as const

export type FieldZoomValue = (typeof FIELD_ZOOM_PRESETS)[number]['value']

export const DEFAULT_FIELD_ZOOM: FieldZoomValue = 1

const PRESET_VALUES = new Set<number>(FIELD_ZOOM_PRESETS.map((preset) => preset.value))

export function loadFieldZoom(): FieldZoomValue {
  try {
    const raw = localStorage.getItem(FIELD_ZOOM_STORAGE_KEY)
    if (!raw) return DEFAULT_FIELD_ZOOM

    const parsed = Number.parseFloat(raw)
    if (PRESET_VALUES.has(parsed)) {
      return parsed as FieldZoomValue
    }
  } catch {
    // ignore storage errors
  }

  return DEFAULT_FIELD_ZOOM
}

export function saveFieldZoom(zoom: FieldZoomValue): void {
  try {
    localStorage.setItem(FIELD_ZOOM_STORAGE_KEY, String(zoom))
  } catch {
    // ignore storage errors
  }
}

export function formatFieldZoomPercent(zoom: FieldZoomValue): string {
  return `${Math.round(zoom * 100)}%`
}

export function stepFieldZoom(
  current: FieldZoomValue,
  direction: -1 | 1,
): FieldZoomValue | null {
  const index = FIELD_ZOOM_PRESETS.findIndex((preset) => preset.value === current)
  if (index < 0) return null

  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= FIELD_ZOOM_PRESETS.length) return null

  return FIELD_ZOOM_PRESETS[nextIndex].value
}
