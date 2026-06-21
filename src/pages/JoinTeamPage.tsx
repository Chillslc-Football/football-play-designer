import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'
import * as joinLinkRepository from '../repositories/joinLinkRepository'
import { INVITE_ROLE_LABELS, type InviteRole } from '../types/invite'
import type { JoinLinkPreview } from '../types/joinLink'
import {
  buildJoinTeamUrl,
  clearJoinTeamUrl,
  isJoinLinkTokenCompleted,
  markJoinLinkTokenCompleted,
  redirectToAppHomeFromJoinLink,
  savePendingJoinLinkUrl,
} from '../utils/joinLinkToken'
import './AuthPages.css'
import './AcceptInvitePage.css'

type LoggedOutView = 'details' | 'signup' | 'login'

function JoinTeamLoggedOut({
  token,
  teamName,
  roleLabel,
}: {
  token: string
  teamName: string
  roleLabel: string
}) {
  const [view, setView] = useState<LoggedOutView>('details')
  const joinRedirectUrl = buildJoinTeamUrl(token)

  if (view === 'signup') {
    return (
      <SignupPage
        title="Create account"
        subtitle={`Join ${teamName} as ${roleLabel}`}
        emailRedirectTo={joinRedirectUrl}
        onSwitchToLogin={() => setView('login')}
        onBack={() => setView('details')}
      />
    )
  }

  if (view === 'login') {
    return (
      <LoginPage
        title="Sign in"
        subtitle={`Join ${teamName} as ${roleLabel}`}
        onSwitchToSignup={() => setView('signup')}
        onBack={() => setView('details')}
      />
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join team</h1>
        <p className="auth-card-subtitle">
          You&apos;ve been invited to join <strong>{teamName}</strong> as a{' '}
          <strong>{roleLabel}</strong>.
        </p>
        <p className="accept-invite-notice">
          Create an account or sign in to join this team.
        </p>

        <div className="accept-invite-actions">
          <button type="button" className="btn btn-primary" onClick={() => setView('signup')}>
            Create account
          </button>
          <button type="button" className="btn" onClick={() => setView('login')}>
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}

function JoinTeamLoggedIn({
  token,
  teamName,
  roleLabel,
}: {
  token: string
  teamName: string
  roleLabel: string
}) {
  const { refreshTeam } = useTeam()
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [alreadyMember, setAlreadyMember] = useState(false)

  async function handleJoinTeam() {
    setJoining(true)
    setJoinError(null)

    try {
      const result = await joinLinkRepository.acceptTeamJoinLink(token)

      if (result.status === 'already_member') {
        setAlreadyMember(true)
        markJoinLinkTokenCompleted(token)
        return
      }

      if (result.status !== 'joined') {
        setJoinError('This join link is no longer valid.')
        return
      }

      markJoinLinkTokenCompleted(token)
      await refreshTeam()
      redirectToAppHomeFromJoinLink()
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : 'Could not join team')
    } finally {
      setJoining(false)
    }
  }

  if (alreadyMember) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Already on team</h1>
          <p className="auth-card-subtitle">
            You are already a member of <strong>{teamName}</strong>.
          </p>
          <div className="accept-invite-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => redirectToAppHomeFromJoinLink()}
            >
              Go to Team Hub
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join team</h1>
        <p className="auth-card-subtitle">
          Join <strong>{teamName}</strong> as a <strong>{roleLabel}</strong>.
        </p>

        {joinError && <p className="auth-error">{joinError}</p>}

        <button
          type="button"
          className="btn btn-primary"
          disabled={joining}
          onClick={() => void handleJoinTeam()}
        >
          {joining ? 'Joining team…' : 'Join Team'}
        </button>
      </div>
    </div>
  )
}

function JoinLinkUnavailablePage({
  message,
  isSignedIn,
}: {
  message: string
  isSignedIn: boolean
}) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join link unavailable</h1>
        <p className="auth-card-subtitle">{message}</p>
        <div className="accept-invite-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => redirectToAppHomeFromJoinLink()}
          >
            {isSignedIn ? 'Go to Team Hub' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function JoinTeamPage() {
  const { user, loading: authLoading } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [preview, setPreview] = useState<JoinLinkPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      const urlToken = new URLSearchParams(window.location.search).get('token')

      if (!cancelled) {
        setToken(urlToken)
      }

      if (!urlToken) {
        if (!cancelled) {
          setPreview(null)
          setPreviewLoading(false)
        }
        return
      }

      if (isJoinLinkTokenCompleted(urlToken)) {
        if (!cancelled) {
          setPreview({
            teamName: null,
            role: null,
            status: 'invalid',
          })
          setPreviewLoading(false)
        }
        clearJoinTeamUrl()
        return
      }

      setPreviewLoading(true)
      setPreviewError(null)

      try {
        const parsed = await joinLinkRepository.previewTeamJoinLink(urlToken)
        if (cancelled) return

        if (parsed.status === 'active') {
          savePendingJoinLinkUrl(buildJoinTeamUrl(urlToken))
        } else {
          clearJoinTeamUrl()
        }

        setPreview(parsed)
      } catch (error) {
        if (cancelled) return
        setPreviewError(error instanceof Error ? error.message : 'Could not load join link')
        setPreview(null)
      } finally {
        if (!cancelled) {
          setPreviewLoading(false)
        }
      }
    }

    void loadPreview()
    return () => {
      cancelled = true
    }
  }, [])

  if (authLoading || previewLoading) {
    return <div className="auth-loading">Loading join link…</div>
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Invalid join link</h1>
          <p className="auth-card-subtitle">This join link is missing a token.</p>
        </div>
      </div>
    )
  }

  if (previewError) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Join link unavailable</h1>
          <p className="auth-error">{previewError}</p>
        </div>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Join link unavailable</h1>
          <p className="auth-card-subtitle">This join link is not valid.</p>
        </div>
      </div>
    )
  }

  const teamName = preview.teamName ?? 'this team'
  const roleLabel = preview.role ? INVITE_ROLE_LABELS[preview.role as InviteRole] : 'member'

  if (preview.status !== 'active') {
    const message =
      preview.status === 'revoked'
        ? 'This join link was revoked. Ask your coach for a new link.'
        : 'This join link is not valid.'

    return <JoinLinkUnavailablePage message={message} isSignedIn={Boolean(user)} />
  }

  if (!user) {
    return <JoinTeamLoggedOut token={token} teamName={teamName} roleLabel={roleLabel} />
  }

  return <JoinTeamLoggedIn token={token} teamName={teamName} roleLabel={roleLabel} />
}
