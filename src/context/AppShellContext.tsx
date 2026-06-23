import { createContext, useContext, type ReactNode, type RefObject } from 'react'
import type { AdminTemplateEditSession } from '../types/adminTemplateEdit'

export type AppShellView =
  | 'designer'
  | 'team-hub'
  | 'team-management'
  | 'wristbands'
  | 'team-updates'
  | 'messages'
  | 'calendar'
  | 'admin-templates'

export type AppShellLaunchMode = 'create' | 'play-library'

export type DesignerHeaderHandlers = {
  onTeamChange: (teamId: string) => void
  onLogout: () => void
}

type AppShellContextValue = {
  view: AppShellView
  setView: (view: AppShellView) => void
  adminTemplateEdit: AdminTemplateEditSession | null
  setAdminTemplateEdit: (session: AdminTemplateEditSession | null) => void
  designerHeaderHandlersRef: RefObject<DesignerHeaderHandlers | null>
  pageToolbar: ReactNode | null
  setPageToolbar: (content: ReactNode | null) => void
  launchMode: AppShellLaunchMode | null
  navigateTo: (view: AppShellView, launchMode?: AppShellLaunchMode) => void
  clearLaunchMode: () => void
  messageUnreadCount: number
  refreshMessageUnreadCount: () => Promise<void>
  pendingMessageThreadId: string | null
  clearPendingMessageThreadId: () => void
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

type AppShellProviderProps = {
  view: AppShellView
  setView: (view: AppShellView) => void
  adminTemplateEdit: AdminTemplateEditSession | null
  setAdminTemplateEdit: (session: AdminTemplateEditSession | null) => void
  designerHeaderHandlersRef: RefObject<DesignerHeaderHandlers | null>
  pageToolbar: ReactNode | null
  setPageToolbar: (content: ReactNode | null) => void
  launchMode: AppShellLaunchMode | null
  navigateTo: (view: AppShellView, launchMode?: AppShellLaunchMode) => void
  clearLaunchMode: () => void
  messageUnreadCount: number
  refreshMessageUnreadCount: () => Promise<void>
  pendingMessageThreadId: string | null
  clearPendingMessageThreadId: () => void
  children: ReactNode
}

export function AppShellProvider({
  view,
  setView,
  adminTemplateEdit,
  setAdminTemplateEdit,
  designerHeaderHandlersRef,
  pageToolbar,
  setPageToolbar,
  launchMode,
  navigateTo,
  clearLaunchMode,
  messageUnreadCount,
  refreshMessageUnreadCount,
  pendingMessageThreadId,
  clearPendingMessageThreadId,
  children,
}: AppShellProviderProps) {
  return (
    <AppShellContext.Provider
      value={{
        view,
        setView,
        adminTemplateEdit,
        setAdminTemplateEdit,
        designerHeaderHandlersRef,
        pageToolbar,
        setPageToolbar,
        launchMode,
        navigateTo,
        clearLaunchMode,
        messageUnreadCount,
        refreshMessageUnreadCount,
        pendingMessageThreadId,
        clearPendingMessageThreadId,
      }}
    >
      {children}
    </AppShellContext.Provider>
  )
}

export function useAppShell() {
  return useContext(AppShellContext)
}
