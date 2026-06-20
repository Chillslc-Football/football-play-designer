import { normalizeTeamFormat, DEFAULT_TEAM_FORMAT, type TeamFormat } from '../types/teamFormat'
import { useTeam } from './useTeam'

/** Active team's play format; missing values default to 11v11. */
export function useTeamFormat(): TeamFormat {
  const { team, activeTeamId } = useTeam()
  if (!team || !activeTeamId || team.id !== activeTeamId) {
    return DEFAULT_TEAM_FORMAT
  }
  return normalizeTeamFormat(team.format)
}
