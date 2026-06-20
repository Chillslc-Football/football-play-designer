export const PENDING_PLAYBOOK_DEEP_LINK_KEY = 'pending_playbook_deep_link'
export const OPEN_PLAY_LIBRARY_SESSION_KEY = 'football-play-designer-open-play-library'

export const PLAYBOOK_ACCESS_DENIED_MESSAGE =
  "You do not have access to this team's playbook."

export type PendingPlaybookDeepLink = {
  teamId: string
}

export function parsePlaybookDeepLinkFromUrl(
  search: string = window.location.search,
): PendingPlaybookDeepLink | null {
  const params = new URLSearchParams(search)
  if (params.get('open') !== 'play-library') {
    return null
  }

  const teamId = params.get('team')?.trim()
  if (!teamId) {
    return null
  }

  return { teamId }
}

export function buildPlaybookDeepLink(teamId: string): string {
  const params = new URLSearchParams({
    team: teamId,
    open: 'play-library',
  })
  return `${window.location.origin}/?${params.toString()}`
}

export function savePendingPlaybookDeepLink(link: PendingPlaybookDeepLink): void {
  try {
    localStorage.setItem(PENDING_PLAYBOOK_DEEP_LINK_KEY, JSON.stringify(link))
  } catch {
    // localStorage may be unavailable
  }
}

export function readPendingPlaybookDeepLink(): PendingPlaybookDeepLink | null {
  try {
    const raw = localStorage.getItem(PENDING_PLAYBOOK_DEEP_LINK_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as PendingPlaybookDeepLink
    if (typeof parsed.teamId === 'string' && parsed.teamId.trim().length > 0) {
      return { teamId: parsed.teamId.trim() }
    }
  } catch {
    // ignore invalid stored payload
  }

  return null
}

export function clearPendingPlaybookDeepLink(): void {
  try {
    localStorage.removeItem(PENDING_PLAYBOOK_DEEP_LINK_KEY)
  } catch {
    // ignore
  }
}

export function hasPlaybookDeepLinkPending(): boolean {
  return readPendingPlaybookDeepLink() !== null || parsePlaybookDeepLinkFromUrl() !== null
}

export function clearPlaybookDeepLinkFromUrl(): void {
  window.history.replaceState({}, '', window.location.pathname)
}

/** Persist deep link from URL for post-login handling; strip query params from address bar. */
export function capturePlaybookDeepLinkFromUrl(): PendingPlaybookDeepLink | null {
  const parsed = parsePlaybookDeepLinkFromUrl()
  if (!parsed) {
    return readPendingPlaybookDeepLink()
  }

  savePendingPlaybookDeepLink(parsed)
  clearPlaybookDeepLinkFromUrl()
  return parsed
}

export function markOpenPlayLibraryPending(): void {
  try {
    sessionStorage.setItem(OPEN_PLAY_LIBRARY_SESSION_KEY, '1')
  } catch {
    // sessionStorage may be unavailable
  }
}

export function shouldOpenPlayLibrary(): boolean {
  try {
    return sessionStorage.getItem(OPEN_PLAY_LIBRARY_SESSION_KEY) === '1'
  } catch {
    return false
  }
}

export function clearOpenPlayLibraryPending(): void {
  try {
    sessionStorage.removeItem(OPEN_PLAY_LIBRARY_SESSION_KEY)
  } catch {
    // ignore
  }
}
