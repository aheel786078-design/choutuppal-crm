import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://llcfxewxqrmdzlvnzzxm.supabase.co'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsY2Z4ZXd4cXJtZHpsdm56enhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxOTQwNDIsImV4cCI6MjEwODc3MDA0Mn0.O8kfgtGpQCESZss9lAuB2c_qaN9dlQYUgPfPmZChxhA'
const DEFAULT_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsY2Z4ZXd4cXJtZHpsdm56enhtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MzE5NDA0MiwiZXhwIjoyMTA4NzcwMDQyfQ.77rCyBm-O8qaeqPw23yfmdRIZZHP2q2SKn9ZfF4zgVk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_ROLE

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
