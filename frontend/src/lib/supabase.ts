import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const FALLBACK_SUPABASE_URL = 'https://placeholder.supabase.co'
const FALLBACK_SERVICE_ROLE_KEY = 'placeholder-service-role-key'
const FALLBACK_ANON_KEY = 'placeholder-anon-key'

export function hasServerSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseServiceRoleKey)
}

export function hasBrowserSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey)
}

function buildServerClient() {
  return createClient(
    supabaseUrl ?? FALLBACK_SUPABASE_URL,
    supabaseServiceRoleKey ?? FALLBACK_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}

function buildBrowserClient() {
  return createClient(
    supabaseUrl ?? FALLBACK_SUPABASE_URL,
    supabaseAnonKey ?? FALLBACK_ANON_KEY,
  )
}

let serverClientSingleton: ReturnType<typeof buildServerClient> | null = null
let browserClientSingleton: ReturnType<typeof buildBrowserClient> | null = null

export function createServerClient() {
  if (!serverClientSingleton) {
    serverClientSingleton = buildServerClient()
  }

  return serverClientSingleton
}

function createBrowserClient() {
  if (!browserClientSingleton) {
    browserClientSingleton = buildBrowserClient()
  }

  return browserClientSingleton
}

export const supabaseBrowser = createBrowserClient()
