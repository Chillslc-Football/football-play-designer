import type { AppShellView } from '../context/AppShellContext'

export const APP_SHELL_VIEW_STORAGE_KEY = 'football-play-designer-current-view'

const VALID_VIEWS: readonly AppShellView[] = [
  'designer',
  'team-hub',
  'wristbands',
  'team-updates',
  'messages',
  'calendar',
  'admin-templates',
]

export function isAppShellView(value: unknown): value is AppShellView {
  return typeof value === 'string' && (VALID_VIEWS as readonly string[]).includes(value)
}

export function readStoredAppShellView(): AppShellView {
  try {
    const raw = sessionStorage.getItem(APP_SHELL_VIEW_STORAGE_KEY)
    if (isAppShellView(raw)) {
      return raw
    }
  } catch {
    // sessionStorage may be unavailable (private mode, blocked storage, etc.)
  }
  return 'team-hub'
}

export function writeStoredAppShellView(view: AppShellView): void {
  try {
    sessionStorage.setItem(APP_SHELL_VIEW_STORAGE_KEY, view)
  } catch {
    // ignore write failures
  }
}
