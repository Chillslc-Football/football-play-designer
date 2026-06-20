import type { TeamFormat } from './teamFormat'

export type TeamRole = 'team_owner' | 'coach' | 'player' | 'parent'

export type Team = {
  id: string
  name: string
  created_by: string
  created_at: string
  format: TeamFormat
}

export type TeamMembership = {
  role: TeamRole
  team: Team
}

export type Profile = {
  id: string
  display_name: string
  last_team_id: string | null
  is_app_admin: boolean
}
