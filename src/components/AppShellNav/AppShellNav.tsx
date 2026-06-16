import { useAppShell } from '../../context/AppShellContext'
import { useAppAdmin } from '../../hooks/useAppAdmin'
import './AppShellNav.css'

export function AppShellNav() {
  const shell = useAppShell()
  const isAppAdmin = useAppAdmin()
  if (!shell) return null

  const { view, setView } = shell

  return (
    <nav className="app-shell-nav no-print" aria-label="Main navigation">
      <button
        type="button"
        className={`app-shell-nav-btn ${view === 'designer' ? 'is-active' : ''}`}
        onClick={() => setView('designer')}
      >
        Play Designer
      </button>
      <button
        type="button"
        className={`app-shell-nav-btn ${view === 'wristbands' ? 'is-active' : ''}`}
        onClick={() => setView('wristbands')}
      >
        Wristband Cards
      </button>
      <button
        type="button"
        className={`app-shell-nav-btn ${view === 'team-updates' ? 'is-active' : ''}`}
        onClick={() => setView('team-updates')}
      >
        Team Updates
      </button>
      <button
        type="button"
        className={`app-shell-nav-btn ${view === 'messages' ? 'is-active' : ''}`}
        onClick={() => setView('messages')}
      >
        Messages
      </button>
      <button
        type="button"
        className={`app-shell-nav-btn ${view === 'calendar' ? 'is-active' : ''}`}
        onClick={() => setView('calendar')}
      >
        Calendar
      </button>
      {isAppAdmin && (
        <button
          type="button"
          className={`app-shell-nav-btn ${view === 'admin-templates' ? 'is-active' : ''}`}
          onClick={() => setView('admin-templates')}
        >
          Admin Templates
        </button>
      )}
    </nav>
  )
}
