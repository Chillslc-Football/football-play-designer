import { useEffect, useState } from 'react'
import { TeamProvider } from '../context/TeamProvider'
import { useAuth } from '../hooks/useAuth'
import { AcceptInvitePage } from '../pages/AcceptInvitePage'
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import {
  buildAcceptInviteUrl,
  getInviteTokenFromUrl,
  getPendingInviteUrl,
  isAcceptInvitePath,
  savePendingInviteUrl,
} from '../utils/inviteToken'
import { capturePlaybookDeepLinkFromUrl } from '../utils/playbookLink'
import { TeamGate } from './TeamGate'
import '../pages/AuthPages.css'

function AcceptInviteFlow() {
  const { session, loading } = useAuth()

  if (loading) {
    return <div className="auth-loading">Loading…</div>
  }

  if (session) {
    return (
      <TeamProvider>
        <AcceptInvitePage />
      </TeamProvider>
    )
  }

  return <AcceptInvitePage />
}

function shouldResumePendingInvite(): boolean {
  const pending = getPendingInviteUrl()
  if (!pending) return false

  try {
    const path = new URL(pending).pathname.replace(/\/+$/, '') || '/'
    return path === '/accept-invite'
  } catch {
    return false
  }
}

export function AuthGate() {
  const { session, loading } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')
  const [resumingInvite, setResumingInvite] = useState(false)

  useEffect(() => {
    if (!isAcceptInvitePath()) {
      capturePlaybookDeepLinkFromUrl()
    }
  }, [])

  useEffect(() => {
    if (!isAcceptInvitePath()) return

    const token = getInviteTokenFromUrl()
    if (token) {
      savePendingInviteUrl(buildAcceptInviteUrl(token))
      return
    }

    savePendingInviteUrl()
  }, [])

  useEffect(() => {
    if (loading || isAcceptInvitePath() || !session || !shouldResumePendingInvite()) {
      setResumingInvite(false)
      return
    }

    const pending = getPendingInviteUrl()
    if (!pending) {
      setResumingInvite(false)
      return
    }

    setResumingInvite(true)
    window.location.replace(pending)
  }, [loading, session])

  if (isAcceptInvitePath()) {
    return <AcceptInviteFlow />
  }

  if (loading || resumingInvite) {
    return <div className="auth-loading">Loading…</div>
  }

  if (session) {
    return (
      <TeamProvider>
        <TeamGate />
      </TeamProvider>
    )
  }

  if (authView === 'signup') {
    return <SignupPage onSwitchToLogin={() => setAuthView('login')} />
  }

  return <LoginPage onSwitchToSignup={() => setAuthView('signup')} />
}
