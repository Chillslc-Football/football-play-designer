import './Header.css'

/**
 * The landing-page hero at the top of the app.
 * Sets the football theme and tells the user what the app does.
 */
export function Header() {
  return (
    <header className="header">
      <div className="header-icon" aria-hidden="true">
        🏈
      </div>
      <h1 className="header-title">Football Play Designer MVP</h1>
      <p className="header-subtitle">
        Draw, save, and mirror your plays — built for coaches and players.
      </p>
    </header>
  )
}
