import { useState } from 'react'
import App from '../App'
import { useAuth } from '../hooks/useAuth'
import { LoginPage } from '../pages/LoginPage'
import { SignupPage } from '../pages/SignupPage'
import '../pages/AuthPages.css'

export function AuthGate() {
  const { session, loading } = useAuth()
  const [authView, setAuthView] = useState<'login' | 'signup'>('login')

  if (loading) {
    return <div className="auth-loading">Loading…</div>
  }

  if (session) {
    return <App />
  }

  if (authView === 'signup') {
    return <SignupPage onSwitchToLogin={() => setAuthView('login')} />
  }

  return <LoginPage onSwitchToSignup={() => setAuthView('signup')} />
}
