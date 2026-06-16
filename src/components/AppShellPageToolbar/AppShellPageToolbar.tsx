import { useAppShell } from '../../context/AppShellContext'
import './AppShellPageToolbar.css'

export function AppShellPageToolbar() {
  const shell = useAppShell()
  const content = shell?.pageToolbar

  if (!content) {
    return null
  }

  return (
    <div className="app-shell-page-toolbar no-print" aria-label="Page toolbar">
      {content}
    </div>
  )
}
