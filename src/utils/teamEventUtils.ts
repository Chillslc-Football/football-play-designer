import type { TeamEvent, TeamEventDraft } from '../types/teamEvent'

export function formatTeamEventTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatTeamEventDateTimeRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startsAt} – ${endsAt}`
  }

  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
  const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' })

  if (sameDay) {
    return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`
  }

  return `${formatTeamEventTimestamp(startsAt)} – ${formatTeamEventTimestamp(endsAt)}`
}

export function wasTeamEventEdited(event: { created_at: string; updated_at: string }): boolean {
  const created = new Date(event.created_at).getTime()
  const updated = new Date(event.updated_at).getTime()
  if (Number.isNaN(created) || Number.isNaN(updated)) {
    return false
  }
  return updated - created > 1000
}

export function isPastTeamEvent(event: TeamEvent, now = Date.now()): boolean {
  const endsAt = new Date(event.ends_at).getTime()
  if (Number.isNaN(endsAt)) {
    return false
  }
  return endsAt < now
}

export function partitionTeamEventsByUpcomingPast(
  events: TeamEvent[],
  now = Date.now(),
): { upcoming: TeamEvent[]; past: TeamEvent[] } {
  const upcoming: TeamEvent[] = []
  const past: TeamEvent[] = []

  for (const event of events) {
    if (isPastTeamEvent(event, now)) {
      past.push(event)
    } else {
      upcoming.push(event)
    }
  }

  past.sort((left, right) => new Date(right.starts_at).getTime() - new Date(left.starts_at).getTime())

  return { upcoming, past }
}

export function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

export function datetimeLocalToIso(local: string): string {
  if (!local.trim()) {
    return ''
  }

  const date = new Date(local)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString()
}

export function validateTeamEventDraft(draft: TeamEventDraft): string | null {
  if (!draft.title.trim()) {
    return 'Title is required.'
  }

  if (!draft.starts_at) {
    return 'Start date and time are required.'
  }

  if (!draft.ends_at) {
    return 'End date and time are required.'
  }

  const startsAt = new Date(draft.starts_at).getTime()
  const endsAt = new Date(draft.ends_at).getTime()

  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) {
    return 'Enter valid start and end date/times.'
  }

  if (endsAt <= startsAt) {
    return 'End time must be after start time.'
  }

  return null
}
