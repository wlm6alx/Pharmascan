import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const SUPABASE_URL = url
export const SUPABASE_ANON_KEY = anonKey

const invalid =
  !url ||
  !anonKey ||
  url === 'https://your-project.supabase.co' ||
  anonKey === 'your-anon-key'

export const isSupabaseConfigured = !invalid

if (!isSupabaseConfigured) {
  console.warn(
    '[PharmaScan] Configuration Supabase manquante/invalide. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(
  isSupabaseConfigured ? url : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? anonKey : 'placeholder-anon-key'
)
