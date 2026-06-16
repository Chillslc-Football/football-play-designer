import { useEffect, useState } from 'react'
import App from '../../App'
import { SchemeTemplateProvider } from '../../context/SchemeTemplateProvider'
import { AppShellProvider, type AppShellView } from '../../context/AppShellContext'
import { AdminTemplatesPage } from '../../pages/AdminTemplatesPage'
import { TeamMessagingPage } from '../../pages/TeamMessagingPage'
import { TeamUpdatesPage } from '../../pages/TeamUpdatesPage'
import { WristbandCardsPage } from '../../pages/WristbandCardsPage'
import { useAppAdmin } from '../../hooks/useAppAdmin'
import type { AdminTemplateEditSession } from '../../types/adminTemplateEdit'
import { APP_DISPLAY_THEME } from '../../constants/appDisplayTheme'
import './MainApp.css'

export type AppView = AppShellView

function MainAppViews() {
  const [view, setView] = useState<AppShellView>('designer')
  const [adminTemplateEdit, setAdminTemplateEdit] = useState<AdminTemplateEditSession | null>(null)
  const isAppAdmin = useAppAdmin()

  useEffect(() => {
    if (view === 'admin-templates' && !isAppAdmin) {
      setView('designer')
    }
  }, [view, isAppAdmin])

  return (
    <AppShellProvider
      view={view}
      setView={setView}
      adminTemplateEdit={adminTemplateEdit}
      setAdminTemplateEdit={setAdminTemplateEdit}
    >
      <div className={`main-app app-theme-${APP_DISPLAY_THEME}`}>
        {view === 'designer' ? (
          <App />
        ) : view === 'wristbands' ? (
          <WristbandCardsPage />
        ) : view === 'team-updates' ? (
          <TeamUpdatesPage />
        ) : view === 'messages' ? (
          <TeamMessagingPage />
        ) : (
          <AdminTemplatesPage />
        )}
      </div>
    </AppShellProvider>
  )
}

export function MainApp() {
  return (
    <SchemeTemplateProvider>
      <MainAppViews />
    </SchemeTemplateProvider>
  )
}
