export const PENDING_JOIN_LINK_URL_KEY = 'pending_join_link_url'
export const COMPLETED_JOIN_LINK_TOKEN_KEY = 'completed_join_link_token'

export function buildJoinTeamUrl(token: string): string {
  return `${window.location.origin}/join-team?token=${encodeURIComponent(token)}`
}

export function getJoinLinkTokenFromUrl(
  search: string = window.location.search,
): string | null {
  return new URLSearchParams(search).get('token')
}

export function savePendingJoinLinkUrl(url?: string): void {
  const joinUrl = url ?? window.location.href
  if (!joinUrl.includes('/join-team')) return
  localStorage.setItem(PENDING_JOIN_LINK_URL_KEY, joinUrl)
}

export function getPendingJoinLinkUrl(): string | null {
  return localStorage.getItem(PENDING_JOIN_LINK_URL_KEY)
}

export function clearPendingJoinLinkUrl(): void {
  localStorage.removeItem(PENDING_JOIN_LINK_URL_KEY)
}

export function markJoinLinkTokenCompleted(token: string): void {
  if (!token) return
  localStorage.setItem(COMPLETED_JOIN_LINK_TOKEN_KEY, token)
  clearPendingJoinLinkUrl()
}

export function isJoinLinkTokenCompleted(token: string): boolean {
  return localStorage.getItem(COMPLETED_JOIN_LINK_TOKEN_KEY) === token
}

export function isJoinTeamPath(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/join-team'
}

export function clearJoinTeamUrl(): void {
  clearPendingJoinLinkUrl()
  if (isJoinTeamPath()) {
    window.history.replaceState({}, '', '/')
  }
}

export function redirectToAppHomeFromJoinLink(): void {
  clearPendingJoinLinkUrl()
  window.history.replaceState({}, '', '/')
  window.location.replace('/')
}

export function shouldResumePendingJoinLink(): boolean {
  const pending = getPendingJoinLinkUrl()
  if (!pending) return false

  try {
    const url = new URL(pending)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    if (path !== '/join-team') return false

    const token = url.searchParams.get('token')
    if (token && isJoinLinkTokenCompleted(token)) {
      clearPendingJoinLinkUrl()
      return false
    }

    return true
  } catch {
    return false
  }
}
