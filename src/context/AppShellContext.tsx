import { createContext, useContext, type ReactNode } from 'react'
import type { AdminTemplateEditSession } from '../types/adminTemplateEdit'

export type AppShellView = 'designer' | 'wristbands' | 'team-updates' | 'admin-templates'

type AppShellContextValue = {
  view: AppShellView
  setView: (view: AppShellView) => void
  adminTemplateEdit: AdminTemplateEditSession | null
  setAdminTemplateEdit: (session: AdminTemplateEditSession | null) => void
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

type AppShellProviderProps = {
  view: AppShellView
  setView: (view: AppShellView) => void
  adminTemplateEdit: AdminTemplateEditSession | null
  setAdminTemplateEdit: (session: AdminTemplateEditSession | null) => void
  children: ReactNode
}

export function AppShellProvider({
  view,
  setView,
  adminTemplateEdit,
  setAdminTemplateEdit,
  children,
}: AppShellProviderProps) {
  return (
    <AppShellContext.Provider
      value={{ view, setView, adminTemplateEdit, setAdminTemplateEdit }}
    >
      {children}
    </AppShellContext.Provider>
  )
}

export function useAppShell() {
  return useContext(AppShellContext)
}
