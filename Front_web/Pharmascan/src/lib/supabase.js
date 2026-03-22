import { createClient } from '@supabase/supabase-js'

// Mode démo si l’URL ou la clé anon ne sont pas celles d’un vrai projet Supabase
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const DEMO_MODE =
  !url ||
  !anonKey ||
  url === 'https://your-project.supabase.co' ||
  anonKey === 'your-anon-key'

// Configuration Supabase
const supabaseUrl = url || 'https://your-project.supabase.co'
const supabaseAnonKey = anonKey || 'your-anon-key'

// Créer le client Supabase (sera utilisé en mode production)
let supabaseClient = null

if (!DEMO_MODE) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // Mode démo : créer un client mock
  supabaseClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async ({ email, password }) => {
        // En mode démo, accepter n'importe quel email/mot de passe
        return {
          data: {
            user: {
              id: 'demo-user-123',
              email: email,
              created_at: new Date().toISOString(),
            },
            session: {
              user: {
                id: 'demo-user-123',
                email: email,
              },
            },
          },
          error: null,
        }
      },
      signUp: async ({ email, password }) => {
        return {
          data: {
            user: {
              id: 'demo-user-123',
              email: email,
              created_at: new Date().toISOString(),
            },
            session: {
              user: {
                id: 'demo-user-123',
                email: email,
              },
            },
          },
          error: null,
        }
      },
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback) => {
        // Simuler un changement d'état
        return { unsubscribe: () => {} }
      },
      updateUser: async ({ email }) => ({ data: { user: null }, error: null }),
    },
    from: (table) => ({
      select: (columns) => ({
        eq: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      insert: async () => ({ data: null, error: null }),
      update: () => ({
        eq: async () => ({ error: null }),
      }),
      delete: () => ({
        eq: async () => ({ error: null }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  }
}

export const supabase = supabaseClient
export const isDemoMode = DEMO_MODE
