import { useTeam } from './useTeam'

/** Team owners and coaches may create invite links. */
export function useCanInvite(): boolean {
  const { role } = useTeam()
  return role === 'team_owner' || role === 'coach'
}
