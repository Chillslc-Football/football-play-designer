export const DEFAULT_TEAM_UPDATE_TYPE = 'announcement' as const

export type TeamUpdateType = typeof DEFAULT_TEAM_UPDATE_TYPE

export type TeamUpdate = {
  id: string
  team_id: string
  title: string
  body: string
  update_type: TeamUpdateType
  is_pinned: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export type TeamUpdateDraft = Omit<
  TeamUpdate,
  'team_id' | 'update_type' | 'created_by' | 'created_at' | 'updated_at'
>

export function updateToDraft(update: TeamUpdate): TeamUpdateDraft {
  return {
    id: update.id,
    title: update.title,
    body: update.body,
    is_pinned: update.is_pinned,
  }
}

export function createEmptyTeamUpdateDraft(): TeamUpdateDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    body: '',
    is_pinned: false,
  }
}
