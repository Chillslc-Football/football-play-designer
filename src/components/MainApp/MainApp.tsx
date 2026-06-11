import { useState } from 'react'
import App from '../../App'
import { AppShellProvider, type AppShellView } from '../../context/AppShellContext'
import { WristbandCardsPage } from '../../pages/WristbandCardsPage'
import { APP_DISPLAY_THEME } from '../../constants/appDisplayTheme'
import './MainApp.css'

export type AppView = AppShellView

export function MainApp() {
  const [view, setView] = useState<AppShellView>('designer')

  return (
    <AppShellProvider view={view} setView={setView}>
      <div className={`main-app app-theme-${APP_DISPLAY_THEME}`}>
        {view === 'designer' ? <App /> : <WristbandCardsPage />}
      </div>
    </AppShellProvider>
  )
}
