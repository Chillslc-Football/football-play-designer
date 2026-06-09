import { createContext } from 'react'
import type { Team, TeamRole } from '../types/team'

export type TeamResult = {
  error: string | null
}

export type TeamContextValue = {
  activeTeamId: string | null
  team: Team | null
  role: TeamRole | null
  loading: boolean
  profileLoaded: boolean
  needsOnboarding: boolean
  createTeam: (name: string) => Promise<TeamResult>
  refreshTeam: () => Promise<void>
}

export const TeamContext = createContext<TeamContextValue | null>(null)
