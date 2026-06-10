import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import { supabase } from '../lib/supabaseClient'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'
import * as inviteRepository from '../repositories/inviteRepository'
import { INVITE_ROLE_LABELS, type InvitePreview, type InvitePreviewStatus, type InviteRole } from '../types/invite'
import { clearAcceptInviteUrl, getPendingInviteUrl, savePendingInviteUrl } from '../utils/inviteToken'
import './AuthPages.css'
import './AcceptInvitePage.css'

type LoggedOutView = 'details' | 'signup' | 'login'

function parsePreviewRpcData(data: unknown): InvitePreview | null {
  if (data == null) return null

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null

  const record = row as Record<string, unknown>
  const teamName = typeof record.team_name === 'string' ? record.team_name : null
  const role = typeof record.role === 'string' ? (record.role as InviteRole) : null
  const email =
    typeof record.email === 'string'
      ? record.email
      : typeof record.invited_email === 'string'
        ? record.invited_email
        : null

  if (!teamName && !email && !role) return null

  const status =
    typeof record.status === 'string'
      ? (record.status as InvitePreviewStatus)
      : teamName && email
        ? 'pending'
        : 'invalid'

  return { teamName, role, email, status }
}

function AcceptInviteLoggedOut({
  teamName,
  roleLabel,
  invitedEmail,
  inviteUrl,
}: {
  teamName: string
  roleLabel: string
  invitedEmail: string
  inviteUrl: string
}) {
  const [view, setView] = useState<LoggedOutView>('details')

  if (view === 'signup') {
    return (
      <SignupPage
        defaultEmail={invitedEmail}
        lockedEmail={Boolean(invitedEmail)}
        emailRedirectTo={inviteUrl}
        title="Create account"
        subtitle={`Join ${teamName} as ${roleLabel}`}
        onSwitchToLogin={() => setView('login')}
        onBack={() => setView('details')}
      />
    )
  }

  if (view === 'login') {
    return (
      <LoginPage
        defaultEmail={invitedEmail}
        lockedEmail={Boolean(invitedEmail)}
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
        <h1>Team invite</h1>
        <p className="auth-card-subtitle">
          You&apos;ve been invited to join <strong>{teamName}</strong> as a{' '}
          <strong>{roleLabel}</strong>.
        </p>
        <p className="accept-invite-notice">
          Use <strong>{invitedEmail}</strong> to create an account or sign in. After email
          confirmation, you&apos;ll return here to accept the invite.
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

function AcceptInviteLoggedIn({
  token,
  teamName,
  roleLabel,
  invitedEmail,
}: {
  token: string
  teamName: string
  roleLabel: string
  invitedEmail: string
}) {
  const { user, signOut } = useAuth()
  const { refreshTeam } = useTeam()
  const [acceptError, setAcceptError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

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
          <button type="button" className="btn btn-primary" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  async function handleAcceptInvite() {
    setAccepting(true)
    setAcceptError(null)

    try {
      await inviteRepository.acceptTeamInvite(token)
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
  const [token, setToken] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      const urlToken = new URLSearchParams(window.location.search).get('token')
      const currentInviteUrl = window.location.href

      savePendingInviteUrl(currentInviteUrl)

      if (!cancelled) {
        setToken(urlToken)
        setInviteUrl(currentInviteUrl)
      }

      if (!urlToken) {
        if (!cancelled) {
          setPreview(null)
          setPreviewLoading(false)
        }
        return
      }

      setPreviewLoading(true)
      setPreviewError(null)

      const { data, error } = await supabase.rpc('preview_team_invite', {
        p_token: urlToken,
      })

      if (cancelled) return

      if (error) {
        setPreviewError(error.message)
        setPreview(null)
        setPreviewLoading(false)
        return
      }

      const parsed = parsePreviewRpcData(data)
      if (!parsed) {
        setPreview(null)
        setPreviewLoading(false)
        return
      }

      setPreview(parsed)
      setPreviewLoading(false)
    }

    void loadPreview()
    return () => {
      cancelled = true
    }
  }, [])

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

  if (!preview) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Invite unavailable</h1>
          <p className="auth-card-subtitle">This invite link is not valid.</p>
        </div>
      </div>
    )
  }

  const status = preview.status
  const invitedEmail = preview.email ?? ''
  const teamName = preview.teamName ?? 'this team'
  const roleLabel = preview.role ? INVITE_ROLE_LABELS[preview.role] : 'member'
  const resolvedInviteUrl = inviteUrl ?? getPendingInviteUrl() ?? window.location.href

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
        inviteUrl={resolvedInviteUrl}
      />
    )
  }

  return (
    <AcceptInviteLoggedIn
      token={token}
      teamName={teamName}
      roleLabel={roleLabel}
      invitedEmail={invitedEmail}
    />
  )
}
