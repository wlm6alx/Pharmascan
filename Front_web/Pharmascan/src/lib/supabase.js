import { createClient } from '@supabase/supabase-js'

// Mode démo activé si les variables d'environnement ne sont pas configurées
const DEMO_MODE = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'https://your-project.supabase.co'

// Configuration Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

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
