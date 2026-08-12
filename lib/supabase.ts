import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://sfysxgcxitsewjwjtorz.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeXN4Z2N4aXRzZXdqd2p0b3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MDkwNzksImV4cCI6MjEwMjA4NTA3OX0.k9AunToqaMM0EPNFyaEvKea5XbUF9s21Z9QpKasAUAo"

// Service Role Key - bypassa RLS para operacoes admin
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeXN4Z2N4aXRzZXdqd2p0b3J6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUwOTA3OSwiZXhwIjoyMTAyMDg1MDc5fQ.Jg0SOEj3VQ-xd7BIBoFcarS9QF-fI1rcFNAhJlW_3Wo"

let _supabase: ReturnType<typeof createClient> | null = null
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _supabase
}

// Cliente admin com service role key - bypassa RLS
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  }
  return _supabaseAdmin
}

// Mantém export para compatibilidade, mas agora é lazy
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return (getSupabase() as Record<string | symbol, unknown>)[prop]
  },
})

// Export admin client
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_, prop) {
    return (getSupabaseAdmin() as Record<string | symbol, unknown>)[prop]
  },
})
