const UPDATE_TITLE_MAX_LENGTH = 60
const UPDATE_TITLE_WORD_BREAK_MIN = 40

export function formatTeamUpdateTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function wasTeamUpdateEdited(update: { created_at: string; updated_at: string }): boolean {
  const created = new Date(update.created_at).getTime()
  const updated = new Date(update.updated_at).getTime()
  if (Number.isNaN(created) || Number.isNaN(updated)) {
    return false
  }
  return updated - created > 1000
}

/** Normalize update message for storage and title generation. */
export function normalizeTeamUpdateBody(body: string): string {
  return body.trim()
}

export function isTeamUpdateBodyValid(body: string): boolean {
  return normalizeTeamUpdateBody(body).length > 0
}

/** Derive the stored title from update message text (title column kept in DB). */
export function generateUpdateTitle(body: string): string {
  const normalized = normalizeTeamUpdateBody(body).replace(/\s+/g, ' ')
  if (!normalized) return ''

  if (normalized.length <= UPDATE_TITLE_MAX_LENGTH) {
    return normalized
  }

  const truncated = normalized.slice(0, UPDATE_TITLE_MAX_LENGTH)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace >= UPDATE_TITLE_WORD_BREAK_MIN) {
    return `${truncated.slice(0, lastSpace)}…`
  }

  return `${truncated.trimEnd()}…`
}

export function teamUpdateBodyMatchesTitle(update: { title: string; body: string }): boolean {
  return normalizeTeamUpdateBody(update.body) === normalizeTeamUpdateBody(update.title)
}
