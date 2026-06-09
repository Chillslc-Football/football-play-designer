import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function requireEnv(name: 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_ANON_KEY'): string {
  const value = import.meta.env[name]?.trim()
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env and set your Supabase project URL and anon key.`,
    )
  }
  return value
}

const supabaseUrl = requireEnv('VITE_SUPABASE_URL')
const supabaseAnonKey = requireEnv('VITE_SUPABASE_ANON_KEY')

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)
