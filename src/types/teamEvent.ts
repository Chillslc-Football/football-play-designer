export type TeamEvent = {
  id: string
  team_id: string
  title: string
  starts_at: string
  ends_at: string
  location: string | null
  description: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TeamEventDraft = Omit<
  TeamEvent,
  'team_id' | 'created_by' | 'created_at' | 'updated_at'
>

function defaultEventWindow(): Pick<TeamEventDraft, 'starts_at' | 'ends_at'> {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  start.setHours(start.getHours() + 1)

  const end = new Date(start)
  end.setHours(end.getHours() + 2)

  return {
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
  }
}

export function eventToDraft(event: TeamEvent): TeamEventDraft {
  return {
    id: event.id,
    title: event.title,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    location: event.location,
    description: event.description,
  }
}

export function createEmptyTeamEventDraft(): TeamEventDraft {
  const { starts_at, ends_at } = defaultEventWindow()

  return {
    id: crypto.randomUUID(),
    title: '',
    starts_at,
    ends_at,
    location: null,
    description: null,
  }
}
