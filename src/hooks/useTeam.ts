import { useContext } from 'react'
import { TeamContext, type TeamContextValue } from '../context/teamContext'

export function useTeam(): TeamContextValue {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider')
  }
  return context
}
