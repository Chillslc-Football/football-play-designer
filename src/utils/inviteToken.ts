export const PENDING_INVITE_TOKEN_KEY = 'pending_invite_token'

export function getInviteTokenFromUrl(): string | null {
  const token = new URLSearchParams(window.location.search).get('token')?.trim()
  return token || null
}

export function savePendingInviteToken(token: string): void {
  sessionStorage.setItem(PENDING_INVITE_TOKEN_KEY, token.trim())
}

export function getPendingInviteToken(): string | null {
  const fromUrl = getInviteTokenFromUrl()
  if (fromUrl) return fromUrl
  return sessionStorage.getItem(PENDING_INVITE_TOKEN_KEY)?.trim() || null
}

export function clearPendingInviteToken(): void {
  sessionStorage.removeItem(PENDING_INVITE_TOKEN_KEY)
}

export function isAcceptInvitePath(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  return path === '/accept-invite'
}

export function clearAcceptInviteUrl(): void {
  window.history.replaceState({}, '', '/')
}
