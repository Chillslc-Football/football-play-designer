import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import * as teamRepository from '../repositories/teamRepository'
import type { Team, TeamRole } from '../types/team'
import { TeamContext, type TeamResult } from './teamContext'

type TeamProviderProps = {
  children: ReactNode
}

function applyLoadResult(
  result: teamRepository.ActiveTeamLoadResult,
  setters: {
    setActiveTeamId: (id: string | null) => void
    setTeam: (team: Team | null) => void
    setRole: (role: TeamRole | null) => void
    setNeedsOnboarding: (needs: boolean) => void
  },
) {
  setters.setActiveTeamId(result.activeTeamId)
  setters.setTeam(result.team)
  setters.setRole(result.role)
  setters.setNeedsOnboarding(result.needsOnboarding)
}

export function TeamProvider({ children }: TeamProviderProps) {
  const { user } = useAuth()
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [role, setRole] = useState<TeamRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  const refreshTeam = useCallback(async () => {
    if (!user) {
      setActiveTeamId(null)
      setTeam(null)
      setRole(null)
      setProfileLoaded(false)
      setNeedsOnboarding(false)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const result = await teamRepository.loadActiveTeamForUser(user.id)
      applyLoadResult(result, {
        setActiveTeamId,
        setTeam,
        setRole,
        setNeedsOnboarding,
      })
    } catch (error) {
      console.error('[TeamProvider] failed to load active team', error)
      setActiveTeamId(null)
      setTeam(null)
      setRole(null)
      setNeedsOnboarding(true)
    } finally {
      setProfileLoaded(true)
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshTeam()
  }, [refreshTeam])

  const createTeam = useCallback(
    async (name: string): Promise<TeamResult> => {
      if (!user) {
        return { error: 'Not signed in' }
      }

      const trimmed = name.trim()
      if (trimmed.length < 2) {
        return { error: 'Team name must be at least 2 characters' }
      }

      setLoading(true)

      try {
        const teamId = await teamRepository.createTeam(trimmed)
        const membership = await teamRepository.loadActiveTeamAfterCreate(user.id, teamId)
        setActiveTeamId(teamId)
        setTeam(membership.team)
        setRole(membership.role)
        setProfileLoaded(true)
        setNeedsOnboarding(false)
        return { error: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not create team'
        setActiveTeamId(null)
        setTeam(null)
        setRole(null)
        setNeedsOnboarding(true)
        return { error: message }
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  const value = useMemo(
    () => ({
      activeTeamId,
      team,
      role,
      loading,
      profileLoaded,
      needsOnboarding,
      createTeam,
      refreshTeam,
    }),
    [
      activeTeamId,
      team,
      role,
      loading,
      profileLoaded,
      needsOnboarding,
      createTeam,
      refreshTeam,
    ],
  )

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}
