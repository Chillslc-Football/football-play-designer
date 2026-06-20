export const OPEN_PLAY_LIBRARY_SESSION_KEY = 'football-play-designer-open-play-library'

export function buildPlaybookDeepLink(teamId: string): string {
  const params = new URLSearchParams({
    team: teamId,
    open: 'play-library',
  })
  return `${window.location.origin}/?${params.toString()}`
}

export function parsePlaybookDeepLinkFromUrl(
  search: string = window.location.search,
): { teamId: string } | null {
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

export function clearPlaybookDeepLinkFromUrl(): void {
  window.history.replaceState({}, '', window.location.pathname)
}

export function markOpenPlayLibraryPending(): void {
  try {
    sessionStorage.setItem(OPEN_PLAY_LIBRARY_SESSION_KEY, '1')
  } catch {
    // sessionStorage may be unavailable
  }
}

export function consumeOpenPlayLibraryPending(): boolean {
  try {
    const pending = sessionStorage.getItem(OPEN_PLAY_LIBRARY_SESSION_KEY) === '1'
    if (pending) {
      sessionStorage.removeItem(OPEN_PLAY_LIBRARY_SESSION_KEY)
    }
    return pending
  } catch {
    return false
  }
}
