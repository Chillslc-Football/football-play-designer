import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'
import * as schemeTemplateRepository from '../repositories/schemeTemplateRepository'
import {
  clearSchemeTemplateState,
  setSchemeTemplateState,
} from '../utils/schemeTemplateStore'

type SchemeTemplateContextValue = {
  loading: boolean
  error: string | null
  refreshTemplates: () => Promise<void>
}

const SchemeTemplateContext = createContext<SchemeTemplateContextValue | null>(null)

type SchemeTemplateProviderProps = {
  children: ReactNode
}

export function SchemeTemplateProvider({ children }: SchemeTemplateProviderProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshTemplates = useCallback(async () => {
    if (!user) {
      clearSchemeTemplateState()
      setError(null)
      return
    }

    setLoading(true)

    try {
      const templates = await schemeTemplateRepository.loadGlobalSchemeTemplates()
      setSchemeTemplateState(templates)
      setError(null)
    } catch (loadError) {
      clearSchemeTemplateState()
      setError(
        loadError instanceof Error ? loadError.message : 'Failed to load global scheme templates.',
      )
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshTemplates()
  }, [refreshTemplates])

  const value = useMemo(
    () => ({
      loading,
      error,
      refreshTemplates,
    }),
    [loading, error, refreshTemplates],
  )

  return (
    <SchemeTemplateContext.Provider value={value}>{children}</SchemeTemplateContext.Provider>
  )
}

export function useSchemeTemplates() {
  const context = useContext(SchemeTemplateContext)
  if (!context) {
    throw new Error('useSchemeTemplates must be used within SchemeTemplateProvider')
  }
  return context
}
