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
import { TeamManagementPage } from '../../pages/TeamManagementPage'
import { TeamUpdatesPage } from '../../pages/TeamUpdatesPage'
import { WristbandCardsPage } from '../../pages/WristbandCardsPage'
import { useAppAdmin } from '../../hooks/useAppAdmin'
import { useTeam } from '../../hooks/useTeam'
import type { AdminTemplateEditSession } from '../../types/adminTemplateEdit'
import { APP_DISPLAY_THEME } from '../../constants/appDisplayTheme'
import { readStoredAppShellView, writeStoredAppShellView } from '../../utils/appShellViewStorage'
import {
  clearPendingPlaybookDeepLink,
  markOpenPlayLibraryPending,
  PLAYBOOK_ACCESS_DENIED_MESSAGE,
  readPendingPlaybookDeepLink,
} from '../../utils/playbookLink'
import './MainApp.css'

export type AppView = AppShellView

function readInitialAppShellView(): AppShellView {
  if (readPendingPlaybookDeepLink()) {
    return 'designer'
  }

  return readStoredAppShellView()
}

function MainAppViews() {
  const [view, setView] = useState<AppShellView>(() => readInitialAppShellView())
  const [launchMode, setLaunchMode] = useState<AppShellLaunchMode | null>(() =>
    readPendingPlaybookDeepLink() ? 'play-library' : null,
  )
  const [adminTemplateEdit, setAdminTemplateEdit] = useState<AdminTemplateEditSession | null>(null)
  const [pageToolbar, setPageToolbar] = useState<ReactNode | null>(null)
  const designerHeaderHandlersRef = useRef<DesignerHeaderHandlers | null>(null)
  const isAppAdmin = useAppAdmin()
  const { profileLoaded, team, switchTeam } = useTeam()
  const playbookDeepLinkHandledRef = useRef(false)
  const [playbookDeepLinkError, setPlaybookDeepLinkError] = useState<string | null>(null)
  const [playbookDeepLinkProcessing, setPlaybookDeepLinkProcessing] = useState(() =>
    Boolean(readPendingPlaybookDeepLink()),
  )

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

  useEffect(() => {
    if (!profileLoaded || !team || playbookDeepLinkHandledRef.current) {
      return
    }

    const pending = readPendingPlaybookDeepLink()
    if (!pending) {
      setPlaybookDeepLinkProcessing(false)
      return
    }

    playbookDeepLinkHandledRef.current = true

    void (async () => {
      setPlaybookDeepLinkProcessing(true)
      setPlaybookDeepLinkError(null)

      const result = await switchTeam(pending.teamId)
      clearPendingPlaybookDeepLink()

      if (result.error) {
        const isAccessDenied = /not a member/i.test(result.error)
        setPlaybookDeepLinkError(
          isAccessDenied ? PLAYBOOK_ACCESS_DENIED_MESSAGE : result.error,
        )
        setLaunchMode(null)
        setView('team-hub')
        setPlaybookDeepLinkProcessing(false)
        return
      }

      markOpenPlayLibraryPending()
      setLaunchMode('play-library')
      setView('designer')
      setPlaybookDeepLinkProcessing(false)
    })()
  }, [profileLoaded, team, switchTeam])

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
        {playbookDeepLinkProcessing && (
          <p className="main-app-playbook-deep-link-status">Opening playbook…</p>
        )}
        {playbookDeepLinkError && (
          <p className="main-app-playbook-deep-link-error" role="alert">
            {playbookDeepLinkError}
          </p>
        )}
        <div className="main-app-body">
          {view === 'designer' ? (
            <App />
          ) : view === 'team-hub' ? (
            <TeamHubPage />
          ) : view === 'wristbands' ? (
            <WristbandCardsPage />
          ) : view === 'team-updates' ? (
            <TeamUpdatesPage />
          ) : view === 'team-management' ? (
            <TeamManagementPage />
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
