import { useEffect } from 'react'
import { ImportArchivedAssetsWizard } from './ImportArchivedAssetsWizard/ImportArchivedAssetsWizard'
import { MainApp } from './MainApp/MainApp'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import { CreateTeamPage } from '../pages/CreateTeamPage'
import { clearPendingInviteUrl } from '../utils/inviteToken'
import '../pages/AuthPages.css'

export function TeamGate() {
  const { user } = useAuth()
  const {
    activeTeamId,
    team,
    memberships,
    profileLoaded,
    needsOnboarding,
    pendingArchiveImport,
    clearPendingArchiveImport,
    bumpArchiveImportTick,
  } = useTeam()

  useEffect(() => {
    if (!profileLoaded) return

    if (!needsOnboarding) {
      clearPendingInviteUrl()
    }

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
    profileLoaded,
    needsOnboarding,
    team,
    activeTeamId,
    memberships.length,
    user?.id,
  ])

  useEffect(() => {
    if (!profileLoaded || needsOnboarding || !team) return

    console.log('[TeamGate] archive import wizard state', {
      pendingArchiveImport,
      activeTeamId,
      teamFormat: team.format ?? null,
      needsOnboarding,
    })
  }, [profileLoaded, needsOnboarding, team, pendingArchiveImport, activeTeamId])

  if (!profileLoaded) {
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

  return (
    <>
      <MainApp />
      {pendingArchiveImport && (
        <ImportArchivedAssetsWizard
          open
          teamId={pendingArchiveImport.teamId}
          teamFormat={pendingArchiveImport.teamFormat}
          onSkip={clearPendingArchiveImport}
          onImportComplete={() => {
            bumpArchiveImportTick()
            clearPendingArchiveImport()
          }}
        />
      )}
    </>
  )
}
