import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type AuthResult = {
  error: string | null
  message: string | null
}

export type SignUpOptions = {
  emailRedirectTo?: string
}

export type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (
    email: string,
    password: string,
    displayName: string,
    options?: SignUpOptions,
  ) => Promise<AuthResult>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
