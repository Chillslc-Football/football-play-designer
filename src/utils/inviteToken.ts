export const PENDING_INVITE_URL_KEY = 'pending_invite_url'
export const COMPLETED_INVITE_TOKEN_KEY = 'completed_invite_token'

export function buildAcceptInviteUrl(token: string): string {
  return `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`
}

export function getInviteTokenFromUrl(
  search: string = window.location.search,
): string | null {
  return new URLSearchParams(search).get('token')
}

export function savePendingInviteUrl(url?: string): void {
  const inviteUrl = url ?? window.location.href
  if (!inviteUrl.includes('/accept-invite')) return
  localStorage.setItem(PENDING_INVITE_URL_KEY, inviteUrl)
}

export function getPendingInviteUrl(): string | null {
  return localStorage.getItem(PENDING_INVITE_URL_KEY)
}

export function clearPendingInviteUrl(): void {
  localStorage.removeItem(PENDING_INVITE_URL_KEY)
}

export function markInviteTokenCompleted(token: string): void {
  if (!token) return
  localStorage.setItem(COMPLETED_INVITE_TOKEN_KEY, token)
  clearPendingInviteUrl()
}

export function isInviteTokenCompleted(token: string): boolean {
  return localStorage.getItem(COMPLETED_INVITE_TOKEN_KEY) === token
}

export function isAcceptInvitePath(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/accept-invite'
}

export function clearAcceptInviteUrl(): void {
  clearPendingInviteUrl()
  if (isAcceptInvitePath()) {
    window.history.replaceState({}, '', '/')
  }
}

/** Leave invite route and open the normal signed-in app home. */
export function redirectToAppHome(): void {
  clearPendingInviteUrl()
  window.history.replaceState({}, '', '/')
  window.location.replace('/')
}

export function shouldResumePendingInvite(): boolean {
  const pending = getPendingInviteUrl()
  if (!pending) return false

  try {
    const url = new URL(pending)
    const path = url.pathname.replace(/\/+$/, '') || '/'
    if (path !== '/accept-invite') return false

    const token = url.searchParams.get('token')
    if (token && isInviteTokenCompleted(token)) {
      clearPendingInviteUrl()
      return false
    }

    return true
  } catch {
    return false
  }
}
