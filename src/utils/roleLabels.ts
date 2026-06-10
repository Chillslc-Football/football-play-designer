import type { TeamRole } from '../types/team'

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  team_owner: 'Owner',
  coach: 'Coach',
  player: 'Player',
  parent: 'Parent',
}
