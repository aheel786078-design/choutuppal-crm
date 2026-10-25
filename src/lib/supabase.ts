import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl && !supabaseUrl.includes('your-project') && supabaseAnonKey
)

export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

export function getSupabaseAdminClient() {
  if (!isSupabaseConfigured || !supabaseServiceRole) return null
  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
