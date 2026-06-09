import { useState } from 'react'
import { TeamProvider } from '../context/TeamProvider'
import { useAuth } from '../hooks/useAuth'
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import { TeamGate } from './TeamGate'
import '../pages/AuthPages.css'

export function AuthGate() {
  const { session, loading } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')

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
