import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTeam } from '../hooks/useTeam'
import { supabase } from '../lib/supabaseClient'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'
import * as inviteRepository from '../repositories/inviteRepository'
import { INVITE_ROLE_LABELS, type InvitePreview, type InvitePreviewStatus, type InviteRole } from '../types/invite'
import { clearAcceptInviteUrl, clearPendingInviteToken } from '../utils/inviteToken'
import './AuthPages.css'
import './AcceptInvitePage.css'

type PreviewRpcRow = {
  team_name: string | null
  role: InviteRole | null
  email: string | null
  status: InvitePreviewStatus
}

function readTokenFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('token')
}

function parsePreviewRpcData(data: unknown): PreviewRpcRow | null {
  if (data == null) return null

  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') return null

  return row as PreviewRpcRow
}

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
          Sign in or create an account using <strong>{invitedEmail}</strong> to accept this
          invite.
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
  const { user } = useAuth()
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
        </div>
      </div>
    )
  }

  async function handleAcceptInvite() {
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
  const [token, setToken] = useState<string | null>(null)
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      const urlToken = readTokenFromUrl()
      setToken(urlToken)

      console.log('[AcceptInvite] token', urlToken)

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

      console.log('[AcceptInvite] preview_team_invite', { token: urlToken, data, error })

      if (cancelled) return

      if (error) {
        setPreviewError(error.message)
        setPreview(null)
        setPreviewLoading(false)
        return
      }

      const row = parsePreviewRpcData(data)
      if (!row) {
        setPreview(null)
        setPreviewLoading(false)
        return
      }

      setPreview({
        teamName: row.team_name,
        role: row.role,
        email: row.email,
        status: row.status,
      })
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

  if (status !== 'pending') {
    const message =
      status === 'expired'
        ? 'This invite has expired. Ask your coach for a new link.'
        : status === 'accepted'
          ? 'This invite has already been used.'
          : status === 'revoked'
            ? 'This invite was revoked.'
            : status === 'invalid'
              ? 'This invite link is not valid.'
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
      token={token}
      teamName={teamName}
      roleLabel={roleLabel}
      invitedEmail={invitedEmail}
    />
  )
}
