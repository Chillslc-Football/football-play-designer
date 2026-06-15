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
