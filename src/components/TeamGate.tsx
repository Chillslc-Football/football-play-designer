import App from '../App'
import { useTeam } from '../hooks/useTeam'
import { CreateTeamPage } from '../pages/CreateTeamPage'
import '../pages/AuthPages.css'

export function TeamGate() {
  const { team, loading, profileLoaded, needsOnboarding } = useTeam()

  if (loading || !profileLoaded) {
    return <div className="auth-loading">Loading team…</div>
  }

  if (needsOnboarding || !team) {
    return <CreateTeamPage />
  }

  return <App />
}
