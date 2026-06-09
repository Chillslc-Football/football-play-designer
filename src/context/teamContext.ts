import { createContext } from 'react'
import type { Team, TeamMembership, TeamRole } from '../types/team'

export type TeamResult = {
  error: string | null
}

export type TeamContextValue = {
  activeTeamId: string | null
  team: Team | null
  role: TeamRole | null
  memberships: TeamMembership[]
  loading: boolean
  profileLoaded: boolean
  needsOnboarding: boolean
  createTeam: (name: string) => Promise<TeamResult>
  switchTeam: (teamId: string) => Promise<TeamResult>
  refreshTeam: () => Promise<void>
}

export const TeamContext = createContext<TeamContextValue | null>(null)
