import { useTeam } from './useTeam'

export function useAppAdmin(): boolean {
  const { isAppAdmin } = useTeam()
  return isAppAdmin
}
