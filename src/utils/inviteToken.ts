export const PENDING_INVITE_URL_KEY = 'pending_invite_url'

export function getInviteTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('token')
}

export function savePendingInviteUrl(url?: string): void {
  const inviteUrl = url ?? window.location.href
  if (!inviteUrl.includes('/accept-invite')) return
  localStorage.setItem(PENDING_INVITE_URL_KEY, inviteUrl)
}

export function getPendingInviteUrl(): string | null {
  const fromCurrent = window.location.pathname.replace(/\/+$/, '') === '/accept-invite'
    ? window.location.href
    : null
  if (fromCurrent) return fromCurrent
  return localStorage.getItem(PENDING_INVITE_URL_KEY)
}

export function clearPendingInviteUrl(): void {
  localStorage.removeItem(PENDING_INVITE_URL_KEY)
}

export function isAcceptInvitePath(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/accept-invite'
}

export function clearAcceptInviteUrl(): void {
  clearPendingInviteUrl()
  window.history.replaceState({}, '', '/')
}
