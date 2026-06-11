import { createContext, useContext, type ReactNode } from 'react'

export type AppShellView = 'designer' | 'wristbands'

type AppShellContextValue = {
  view: AppShellView
  setView: (view: AppShellView) => void
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

type AppShellProviderProps = {
  view: AppShellView
  setView: (view: AppShellView) => void
  children: ReactNode
}

export function AppShellProvider({ view, setView, children }: AppShellProviderProps) {
  return (
    <AppShellContext.Provider value={{ view, setView }}>{children}</AppShellContext.Provider>
  )
}

export function useAppShell() {
  return useContext(AppShellContext)
}
