import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
import { useAuth } from '../../hooks/useAuth'
import { useTeam } from '../../hooks/useTeam'
import * as teamMessageRepository from '../../repositories/teamMessageRepository'
import type { AdminTemplateEditSession } from '../../types/adminTemplateEdit'
import { APP_DISPLAY_THEME } from '../../constants/appDisplayTheme'
import { readStoredAppShellView, writeStoredAppShellView } from '../../utils/appShellViewStorage'
import {
  clearPendingMessageDeepLink,
  MESSAGE_ACCESS_DENIED_MESSAGE,
  readPendingMessageDeepLink,
  savePendingMessageDeepLink,
} from '../../utils/messageLink'
import {
  clearPendingPlaybookDeepLink,
  markOpenPlayLibraryPending,
  PLAYBOOK_ACCESS_DENIED_MESSAGE,
  readPendingPlaybookDeepLink,
} from '../../utils/playbookLink'
import './MainApp.css'
import {
  setTeamMessageNotificationClickHandler,
  showTeamMessageBrowserNotification,
} from '../../notifications/browserMessageNotification'

export type AppView = AppShellView

function readInitialAppShellView(): AppShellView {
  if (readPendingMessageDeepLink()) {
    return 'messages'
  }

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
  const [messageUnreadCount, setMessageUnreadCount] = useState(0)
  const designerHeaderHandlersRef = useRef<DesignerHeaderHandlers | null>(null)
  const isAppAdmin = useAppAdmin()
  const { user } = useAuth()
  const {
    activeTeamId,
    profileLoaded,
    team,
    switchTeam,
    openTeamHubAfterCreate,
    clearOpenTeamHubAfterCreate,
  } = useTeam()
  const messageDeepLinkHandledRef = useRef(false)
  const playbookDeepLinkHandledRef = useRef(false)
  const [messageDeepLinkError, setMessageDeepLinkError] = useState<string | null>(null)
  const [playbookDeepLinkError, setPlaybookDeepLinkError] = useState<string | null>(null)
  const [messageDeepLinkProcessing, setMessageDeepLinkProcessing] = useState(() =>
    Boolean(readPendingMessageDeepLink()),
  )
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

  const notificationNavigationRef = useRef({
    navigateTo,
    switchTeam,
    activeTeamId,
  })

  notificationNavigationRef.current = {
    navigateTo,
    switchTeam,
    activeTeamId,
  }

  const refreshMessageUnreadCount = useCallback(async () => {
    if (!activeTeamId) {
      setMessageUnreadCount(0)
      return
    }

    try {
      const count = await teamMessageRepository.getTeamMessageUnreadCount(activeTeamId)
      setMessageUnreadCount(count)
    } catch {
      setMessageUnreadCount(0)
    }
  }, [activeTeamId])

  useEffect(() => {
    void refreshMessageUnreadCount()
  }, [refreshMessageUnreadCount])

  useEffect(() => {
    setTeamMessageNotificationClickHandler(async (payload) => {
      const { navigateTo: goToView, switchTeam: changeTeam, activeTeamId: currentTeamId } =
        notificationNavigationRef.current

      try {
        window.focus()
      } catch {
        // ignore focus failures
      }

      savePendingMessageDeepLink({
        teamId: payload.teamId,
        threadId: payload.threadId,
        messageId: payload.messageId,
      })

      if (currentTeamId !== payload.teamId) {
        const result = await changeTeam(payload.teamId)
        if (result.error) {
          clearPendingMessageDeepLink()
          return
        }
      }

      clearPendingMessageDeepLink()
      goToView('messages')
    })

    return () => {
      setTeamMessageNotificationClickHandler(null)
    }
  }, [])

  useEffect(() => {
    if (!activeTeamId || !user?.id || view === 'messages') {
      return
    }

    let cancelled = false
    let unsubscribe: (() => void) | null = null

    void (async () => {
      try {
        const thread = await teamMessageRepository.getOrCreateTeamChatThread(activeTeamId)
        if (cancelled) return

        unsubscribe = teamMessageRepository.subscribeToTeamMessages(
          activeTeamId,
          thread.id,
          (message) => {
            if (message.sender_id !== user.id) {
              void refreshMessageUnreadCount()
              showTeamMessageBrowserNotification({
                teamId: message.team_id,
                threadId: message.thread_id,
                messageId: message.id,
                body: message.body,
              })
            }
          },
        )
      } catch {
        // Ignore subscription setup failures; count still refreshes on navigation.
      }
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [activeTeamId, user?.id, view, refreshMessageUnreadCount])

  useEffect(() => {
    if (!openTeamHubAfterCreate) return
    setViewAndClearLaunch('team-hub')
    clearOpenTeamHubAfterCreate()
  }, [openTeamHubAfterCreate, clearOpenTeamHubAfterCreate])

  useEffect(() => {
    writeStoredAppShellView(view)
  }, [view])

  useEffect(() => {
    if (view === 'admin-templates' && !isAppAdmin) {
      setViewAndClearLaunch('team-hub')
    }
  }, [view, isAppAdmin])

  useEffect(() => {
    if (!profileLoaded || !team || messageDeepLinkHandledRef.current) {
      return
    }

    const pending = readPendingMessageDeepLink()
    if (!pending) {
      setMessageDeepLinkProcessing(false)
      return
    }

    messageDeepLinkHandledRef.current = true

    void (async () => {
      setMessageDeepLinkProcessing(true)
      setMessageDeepLinkError(null)

      const result = await switchTeam(pending.teamId)
      clearPendingMessageDeepLink()

      if (result.error) {
        const isAccessDenied = /not a member/i.test(result.error)
        setMessageDeepLinkError(
          isAccessDenied ? MESSAGE_ACCESS_DENIED_MESSAGE : result.error,
        )
        setView('team-hub')
        setMessageDeepLinkProcessing(false)
        return
      }

      setView('messages')
      setMessageDeepLinkProcessing(false)
    })()
  }, [profileLoaded, team, switchTeam])

  useEffect(() => {
    if (!profileLoaded || !team || playbookDeepLinkHandledRef.current) {
      return
    }

    if (readPendingMessageDeepLink()) {
      setPlaybookDeepLinkProcessing(false)
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
      messageUnreadCount={messageUnreadCount}
      refreshMessageUnreadCount={refreshMessageUnreadCount}
    >
      <div className={`main-app app-theme-${APP_DISPLAY_THEME}`}>
        <AppShellHeader />
        <AppShellPageToolbar />
        {messageDeepLinkProcessing && (
          <p className="main-app-playbook-deep-link-status">Opening messages…</p>
        )}
        {messageDeepLinkError && (
          <p className="main-app-playbook-deep-link-error" role="alert">
            {messageDeepLinkError}
          </p>
        )}
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
