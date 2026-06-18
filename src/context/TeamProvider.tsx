import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import * as teamRepository from '../repositories/teamRepository'
import type { Team, TeamMembership, TeamRole } from '../types/team'
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
    setMemberships: (memberships: TeamMembership[]) => void
    setNeedsOnboarding: (needs: boolean) => void
  },
) {
  setters.setActiveTeamId(result.activeTeamId)
  setters.setTeam(result.team)
  setters.setRole(result.role)
  setters.setMemberships(result.memberships)
  setters.setNeedsOnboarding(result.needsOnboarding)
}

export function TeamProvider({ children }: TeamProviderProps) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const loadedUserIdRef = useRef<string | null>(null)
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [role, setRole] = useState<TeamRole | null>(null)
  const [memberships, setMemberships] = useState<TeamMembership[]>([])
  const [loading, setLoading] = useState(true)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [isAppAdmin, setIsAppAdmin] = useState(false)

  const refreshTeam = useCallback(async () => {
    if (!userId) {
      loadedUserIdRef.current = null
      setActiveTeamId(null)
      setTeam(null)
      setRole(null)
      setMemberships([])
      setProfileLoaded(false)
      setIsAppAdmin(false)
      setNeedsOnboarding(false)
      setLoading(false)
      return
    }

    const isInitialLoadForUser = loadedUserIdRef.current !== userId
    if (isInitialLoadForUser) {
      setProfileLoaded(false)
      setLoading(true)
    }

    try {
      const result = await teamRepository.loadActiveTeamForUser(userId)
      applyLoadResult(result, {
        setActiveTeamId,
        setTeam,
        setRole,
        setMemberships,
        setNeedsOnboarding,
      })
      setIsAppAdmin(result.profile?.is_app_admin ?? false)
      loadedUserIdRef.current = userId
      console.log('[TeamProvider] active team state applied', {
        userId,
        activeTeamId: result.activeTeamId,
        teamId: result.team?.id ?? null,
        teamName: result.team?.name ?? null,
        role: result.role,
        membershipCount: result.memberships.length,
        needsOnboarding: result.needsOnboarding,
      })
    } catch (error) {
      console.error('[TeamProvider] failed to load active team', {
        userId,
        error,
      })
      setActiveTeamId(null)
      setTeam(null)
      setRole(null)
      setMemberships([])
      setIsAppAdmin(false)
      setNeedsOnboarding(false)
    } finally {
      setProfileLoaded(true)
      setLoading(false)
    }
  }, [userId])

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
        await teamRepository.loadActiveTeamAfterCreate(user.id, teamId)
        const result = await teamRepository.loadActiveTeamForUser(user.id)
        applyLoadResult(result, {
          setActiveTeamId,
          setTeam,
          setRole,
          setMemberships,
          setNeedsOnboarding,
        })
        return { error: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not create team'
        setActiveTeamId(null)
        setTeam(null)
        setRole(null)
        setMemberships([])
        setNeedsOnboarding(true)
        return { error: message }
      } finally {
        setProfileLoaded(true)
        setLoading(false)
      }
    },
    [user],
  )

  const switchTeam = useCallback(
    async (teamId: string): Promise<TeamResult> => {
      if (!user) {
        return { error: 'Not signed in' }
      }

      const membership = memberships.find((entry) => entry.team.id === teamId)
      if (!membership) {
        return { error: 'You are not a member of that team' }
      }

      if (teamId === activeTeamId) {
        return { error: null }
      }

      try {
        await teamRepository.updateLastTeamId(user.id, teamId)
        setActiveTeamId(teamId)
        setTeam(membership.team)
        setRole(membership.role)
        return { error: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not switch team'
        return { error: message }
      }
    },
    [user, memberships, activeTeamId],
  )

  const deleteTeam = useCallback(
    async (teamId: string): Promise<TeamResult> => {
      if (!user) {
        return { error: 'Not signed in' }
      }

      if (role !== 'team_owner') {
        return { error: 'Only team owners can delete teams' }
      }

      if (teamId !== activeTeamId) {
        return { error: 'You can only delete the active team' }
      }

      setLoading(true)

      try {
        console.log('[TeamProvider.deleteTeam] request', {
          teamId,
          activeTeamId,
          role,
          userId: user.id,
        })

        await teamRepository.deleteTeam(teamId, { role })

        const result = await teamRepository.loadActiveTeamForUser(user.id)
        console.log('[TeamProvider.deleteTeam] reload result', {
          activeTeamId: result.activeTeamId,
          team: result.team?.id ?? null,
          membershipCount: result.memberships.length,
          needsOnboarding: result.needsOnboarding,
        })

        applyLoadResult(result, {
          setActiveTeamId,
          setTeam,
          setRole,
          setMemberships,
          setNeedsOnboarding,
        })

        if (result.team?.id === teamId) {
          throw new Error('Team delete appeared to succeed but the team is still active. Refresh and try again.')
        }

        return { error: null }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not delete team'
        console.error('[TeamProvider.deleteTeam] failed', { teamId, role, message, error })
        return { error: message }
      } finally {
        setProfileLoaded(true)
        setLoading(false)
      }
    },
    [user, role, activeTeamId],
  )

  const value = useMemo(
    () => ({
      activeTeamId,
      team,
      role,
      memberships,
      loading,
      profileLoaded,
      isAppAdmin,
      needsOnboarding,
      createTeam,
      switchTeam,
      deleteTeam,
      refreshTeam,
    }),
    [
      activeTeamId,
      team,
      role,
      memberships,
      loading,
      profileLoaded,
      isAppAdmin,
      needsOnboarding,
      createTeam,
      switchTeam,
      deleteTeam,
      refreshTeam,
    ],
  )

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}
