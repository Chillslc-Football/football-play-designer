import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { AuthContext, type AuthResult, type SignUpOptions } from './authContext'

type AuthProviderProps = {
  children: ReactNode
}

function toAuthResult(error: { message: string } | null, message: string | null = null): AuthResult {
  return { error: error?.message ?? null, message }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    return toAuthResult(error)
  }, [])

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      options?: SignUpOptions,
    ): Promise<AuthResult> => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
          emailRedirectTo: options?.emailRedirectTo,
        },
      })

      if (error) {
        return toAuthResult(error)
      }

      if (!data.session) {
        const redirectHint = options?.emailRedirectTo
          ? ' After confirming, you will return to this invite to accept it.'
          : ' Check your email to confirm your account.'
        return toAuthResult(null, `Account created.${redirectHint}`)
      }

      return toAuthResult(null)
    },
    [],
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, user, loading, signIn, signUp, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
