import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const invalid =
  !url ||
  !anonKey ||
  url === 'https://your-project.supabase.co' ||
  anonKey === 'your-anon-key'

if (invalid) {
  throw new Error(
    '[PharmaScan] Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY requises (projet Supabase réel). Copiez .env.example vers .env et renseignez les valeurs depuis Supabase > Settings > API.'
  )
}

export const supabase = createClient(url, anonKey)
