import { createContext } from 'react'
import type { Team, TeamMembership, TeamRole } from '../types/team'
import type { TeamFormat } from '../types/teamFormat'

export type TeamResult = {
  error: string | null
}

export type TeamContextValue = {
  activeTeamId: string | null
  team: Team | null
  role: TeamRole | null
  displayName: string | null
  memberships: TeamMembership[]
  loading: boolean
  profileLoaded: boolean
  isAppAdmin: boolean
  needsOnboarding: boolean
  createTeam: (name: string, format?: TeamFormat) => Promise<TeamResult>
  switchTeam: (teamId: string) => Promise<TeamResult>
  deleteTeam: (teamId: string) => Promise<TeamResult>
  refreshTeam: () => Promise<void>
}

export const TeamContext = createContext<TeamContextValue | null>(null)
