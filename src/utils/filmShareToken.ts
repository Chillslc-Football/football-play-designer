export function isFilmSharePath(): boolean {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const segments = path.split('/').filter(Boolean)
  return segments.length === 3 && segments[0] === 'film' && segments[1] === 'share'
}

export function getFilmShareTokenFromUrl(): string | null {
  if (!isFilmSharePath()) return null

  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  const token = path.split('/').filter(Boolean)[2]?.trim()
  return token || null
}
