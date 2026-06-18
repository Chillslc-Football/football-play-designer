import { useEffect, useRef, useState, type ReactNode } from 'react'
import App from '../../App'
import { SchemeTemplateProvider } from '../../context/SchemeTemplateProvider'
import {
  AppShellProvider,
  type AppShellLaunchMode,
  type AppShellView,
  type DesignerHeaderHandlers,
} from '../../context/AppShellContext'
import { AppShellHeader } from '../AppShellHeader/AppShellHeader'
import { AppShellPageToolbar } from '../AppShellPageToolbar/AppShellPageToolbar'
import { AdminTemplatesPage } from '../../pages/AdminTemplatesPage'
import { TeamCalendarPage } from '../../pages/TeamCalendarPage'
import { TeamHubPage } from '../../pages/TeamHubPage'
import { TeamMessagingPage } from '../../pages/TeamMessagingPage'
import { TeamUpdatesPage } from '../../pages/TeamUpdatesPage'
import { WristbandCardsPage } from '../../pages/WristbandCardsPage'
import { useAppAdmin } from '../../hooks/useAppAdmin'
import type { AdminTemplateEditSession } from '../../types/adminTemplateEdit'
import { APP_DISPLAY_THEME } from '../../constants/appDisplayTheme'
import { readStoredAppShellView, writeStoredAppShellView } from '../../utils/appShellViewStorage'
import './MainApp.css'

export type AppView = AppShellView

function MainAppViews() {
  const [view, setView] = useState<AppShellView>(() => readStoredAppShellView())
  const [launchMode, setLaunchMode] = useState<AppShellLaunchMode | null>(null)
  const [adminTemplateEdit, setAdminTemplateEdit] = useState<AdminTemplateEditSession | null>(null)
  const [pageToolbar, setPageToolbar] = useState<ReactNode | null>(null)
  const designerHeaderHandlersRef = useRef<DesignerHeaderHandlers | null>(null)
  const isAppAdmin = useAppAdmin()

  const setViewAndClearLaunch = (nextView: AppShellView) => {
    setLaunchMode(null)
    setView(nextView)
  }

  const navigateTo = (nextView: AppShellView, mode?: AppShellLaunchMode) => {
    setLaunchMode(mode ?? null)
    setView(nextView)
  }

  const clearLaunchMode = () => {
    setLaunchMode(null)
  }

  useEffect(() => {
    writeStoredAppShellView(view)
  }, [view])

  useEffect(() => {
    if (view === 'admin-templates' && !isAppAdmin) {
      setViewAndClearLaunch('team-hub')
    }
  }, [view, isAppAdmin])

  return (
    <AppShellProvider
      view={view}
      setView={setViewAndClearLaunch}
      adminTemplateEdit={adminTemplateEdit}
      setAdminTemplateEdit={setAdminTemplateEdit}
      designerHeaderHandlersRef={designerHeaderHandlersRef}
      pageToolbar={pageToolbar}
      setPageToolbar={setPageToolbar}
      launchMode={launchMode}
      navigateTo={navigateTo}
      clearLaunchMode={clearLaunchMode}
    >
      <div className={`main-app app-theme-${APP_DISPLAY_THEME}`}>
        <AppShellHeader />
        <AppShellPageToolbar />
        <div className="main-app-body">
          {view === 'designer' ? (
            <App />
          ) : view === 'team-hub' ? (
            <TeamHubPage />
          ) : view === 'wristbands' ? (
            <WristbandCardsPage />
          ) : view === 'team-updates' ? (
            <TeamUpdatesPage />
          ) : view === 'messages' ? (
            <TeamMessagingPage />
          ) : view === 'calendar' ? (
            <TeamCalendarPage />
          ) : view === 'admin-templates' ? (
            <AdminTemplatesPage />
          ) : null}
        </div>
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
