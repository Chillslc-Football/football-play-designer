import { useEffect } from 'react'
import { MainApp } from './MainApp/MainApp'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import { CreateTeamPage } from '../pages/CreateTeamPage'
import '../pages/AuthPages.css'

export function TeamGate() {
  const { user } = useAuth()
  const {
    activeTeamId,
    team,
    memberships,
    loading,
    profileLoaded,
    needsOnboarding,
  } = useTeam()

  useEffect(() => {
    if (loading || !profileLoaded) return

    if (needsOnboarding) {
      console.log('[TeamGate] showing Create Team', {
        reason: 'no_team_memberships',
        userId: user?.id ?? null,
        activeTeamId,
        membershipCount: memberships.length,
      })
      return
    }

    if (!team) {
      console.warn('[TeamGate] team load incomplete after profile loaded', {
        reason: 'active_team_missing',
        userId: user?.id ?? null,
        activeTeamId,
        membershipCount: memberships.length,
      })
    }
  }, [
    loading,
    profileLoaded,
    needsOnboarding,
    team,
    activeTeamId,
    memberships.length,
    user?.id,
  ])

  if (loading || !profileLoaded) {
    return <div className="auth-loading">Loading team…</div>
  }

  if (needsOnboarding) {
    return <CreateTeamPage />
  }

  if (!team) {
    return (
      <div className="auth-loading">
        Could not load your team. Check the browser console, refresh, or sign out and try again.
      </div>
    )
  }

  return <MainApp />
}
