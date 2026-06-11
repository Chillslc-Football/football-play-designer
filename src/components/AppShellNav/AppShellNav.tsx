import { useAppShell } from '../../context/AppShellContext'
import './AppShellNav.css'

export function AppShellNav() {
  const shell = useAppShell()
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
    </nav>
  )
}
