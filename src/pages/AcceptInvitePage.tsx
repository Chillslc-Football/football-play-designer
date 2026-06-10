import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'
import * as inviteRepository from '../repositories/inviteRepository'
import { INVITE_ROLE_LABELS, type InvitePreview } from '../types/invite'
import {
  clearAcceptInviteUrl,
  clearPendingInviteToken,
  getPendingInviteToken,
  savePendingInviteToken,
} from '../utils/inviteToken'
import './AuthPages.css'
import './AcceptInvitePage.css'

function AcceptInviteLoggedOut({
  teamName,
  roleLabel,
  invitedEmail,
}: {
  teamName: string
  roleLabel: string
  invitedEmail: string
}) {
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')

  return (
    <div className="auth-page accept-invite-page">
      <div className="auth-card accept-invite-card">
        <h1>Team invite</h1>
        <p className="auth-card-subtitle">
          You&apos;ve been invited to join <strong>{teamName}</strong> as a{' '}
          <strong>{roleLabel}</strong>.
        </p>
        <p className="accept-invite-notice">
          Sign in or create an account using <strong>{invitedEmail}</strong> to accept this invite.
        </p>
      </div>

      {authView === 'signup' ? (
        <SignupPage defaultEmail={invitedEmail} onSwitchToLogin={() => setAuthView('login')} />
      ) : (
        <LoginPage defaultEmail={invitedEmail} onSwitchToSignup={() => setAuthView('signup')} />
      )}
    </div>
  )
}

function AcceptInviteLoggedIn({
  teamName,
  roleLabel,
  invitedEmail,
}: {
  teamName: string
  roleLabel: string
  invitedEmail: string
}) {
  const { user } = useAuth()
  const { refreshTeam } = useTeam()
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const token = getPendingInviteToken()

  const userEmail = user?.email?.toLowerCase() ?? ''
  const emailMatches = userEmail === invitedEmail.toLowerCase()

  if (!emailMatches) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Wrong account</h1>
          <p className="auth-card-subtitle">
            This invite is for <strong>{invitedEmail}</strong>. You are signed in as{' '}
            <strong>{user?.email}</strong>.
          </p>
          <p className="accept-invite-notice">Sign out and sign in with the invited email.</p>
        </div>
      </div>
    )
  }

  async function handleAcceptInvite() {
    if (!token) return

    setAccepting(true)
    setAcceptError(null)

    try {
      await inviteRepository.acceptTeamInvite(token)
      clearPendingInviteToken()
      clearAcceptInviteUrl()
      await refreshTeam()
      window.location.replace('/')
    } catch (error) {
      setAcceptError(error instanceof Error ? error.message : 'Could not accept invite')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Accept team invite</h1>
        <p className="auth-card-subtitle">
          Join <strong>{teamName}</strong> as a <strong>{roleLabel}</strong>.
        </p>

        {acceptError && <p className="auth-error">{acceptError}</p>}

        <button
          type="button"
          className="btn btn-primary"
          disabled={accepting}
          onClick={() => void handleAcceptInvite()}
        >
          {accepting ? 'Joining team…' : 'Accept invite'}
        </button>
      </div>
    </div>
  )
}

export function AcceptInvitePage() {
  const { user, loading: authLoading } = useAuth()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)

  const token = getPendingInviteToken()

  useEffect(() => {
    const currentToken = getPendingInviteToken()
    if (currentToken) {
      savePendingInviteToken(currentToken)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      if (!token) {
        setPreview({ teamName: null, role: null, email: null, status: 'invalid' })
        setPreviewLoading(false)
        return
      }

      setPreviewLoading(true)
      setPreviewError(null)

      try {
        const result = await inviteRepository.previewTeamInvite(token)
        if (!cancelled) {
          setPreview(result)
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Could not load invite')
        }
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
  }, [token])

  if (authLoading || previewLoading) {
    return <div className="auth-loading">Loading invite…</div>
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Invalid invite link</h1>
          <p className="auth-card-subtitle">This invite link is missing a token.</p>
        </div>
      </div>
    )
  }

  if (previewError) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Invite unavailable</h1>
          <p className="auth-error">{previewError}</p>
        </div>
      </div>
    )
  }

  const status = preview?.status ?? 'invalid'
  const invitedEmail = preview?.email ?? ''
  const teamName = preview?.teamName ?? 'this team'
  const roleLabel = preview?.role ? INVITE_ROLE_LABELS[preview.role] : 'member'

  if (status !== 'pending') {
    const message =
      status === 'expired'
        ? 'This invite has expired. Ask your coach for a new link.'
        : status === 'accepted'
          ? 'This invite has already been used.'
          : status === 'revoked'
            ? 'This invite was revoked.'
            : 'This invite link is not valid.'

    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Invite unavailable</h1>
          <p className="auth-card-subtitle">{message}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <AcceptInviteLoggedOut
        teamName={teamName}
        roleLabel={roleLabel}
        invitedEmail={invitedEmail}
      />
    )
  }

  return (
    <AcceptInviteLoggedIn
      teamName={teamName}
      roleLabel={roleLabel}
      invitedEmail={invitedEmail}
    />
  )
}
