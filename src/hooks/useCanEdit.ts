import { useTeam } from './useTeam'

export function useCanEdit(): boolean {
  const { role } = useTeam()
  return role === 'team_owner' || role === 'coach'
}
