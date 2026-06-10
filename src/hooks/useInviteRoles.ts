import { useMemo } from 'react'
import type { InviteRole } from '../types/invite'
import { useTeam } from './useTeam'

export function useInviteRoles(): InviteRole[] {
  const { role } = useTeam()

  return useMemo(() => {
    if (role === 'team_owner') {
      return ['coach', 'player', 'parent']
    }
    if (role === 'coach') {
      return ['player', 'parent']
    }
    return []
  }, [role])
}
