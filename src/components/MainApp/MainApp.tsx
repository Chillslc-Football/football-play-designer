import { useState } from 'react'
import App from '../../App'
import { WristbandCardsPage } from '../../pages/WristbandCardsPage'
import { APP_DISPLAY_THEME } from '../../constants/appDisplayTheme'
import './MainApp.css'

export type AppView = 'designer' | 'wristbands'

export function MainApp() {
  const [view, setView] = useState<AppView>('designer')

  return (
    <div className={`main-app app-theme-${APP_DISPLAY_THEME}`}>
      <nav className="main-app-nav no-print" aria-label="Main navigation">
        <button
          type="button"
          className={`main-app-nav-btn ${view === 'designer' ? 'is-active' : ''}`}
          onClick={() => setView('designer')}
        >
          Play Designer
        </button>
        <button
          type="button"
          className={`main-app-nav-btn ${view === 'wristbands' ? 'is-active' : ''}`}
          onClick={() => setView('wristbands')}
        >
          Wristband Cards
        </button>
      </nav>

      {view === 'designer' ? <App /> : <WristbandCardsPage />}
    </div>
  )
}
