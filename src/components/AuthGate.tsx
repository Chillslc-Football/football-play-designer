import { useEffect, useState } from 'react'
import { TeamProvider } from '../context/TeamProvider'
import { useAuth } from '../hooks/useAuth'
import { AcceptInvitePage } from '../pages/AcceptInvitePage'
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import { isAcceptInvitePath, savePendingInviteUrl } from '../utils/inviteToken'
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

export function AuthGate() {
  const { session, loading } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')

  useEffect(() => {
    if (isAcceptInvitePath()) {
      savePendingInviteUrl()
    }
  }, [])

  if (isAcceptInvitePath()) {
    return <AcceptInviteFlow />
  }

  if (loading) {
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
