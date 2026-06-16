import { useAuth } from '../../hooks/useAuth'
import { useTeam } from '../../hooks/useTeam'
import { useAppShell } from '../../context/AppShellContext'
import { Header } from '../Header/Header'

export function AppShellHeader() {
  const shell = useAppShell()
  const { switchTeam } = useTeam()
  const { signOut } = useAuth()

  const handlers = shell?.designerHeaderHandlersRef.current
  const isDesigner = shell?.view === 'designer'

  if (isDesigner && handlers) {
    return (
      <Header onTeamChange={handlers.onTeamChange} onLogout={handlers.onLogout} />
    )
  }

  return (
    <Header
      onTeamChange={(teamId) => {
        void switchTeam(teamId)
      }}
      onLogout={() => {
        void signOut()
      }}
    />
  )
}
