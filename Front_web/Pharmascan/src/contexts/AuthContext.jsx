import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { isPharmacistAppUser } from '../lib/appUserRole'

function isResetPasswordPath() {
  if (typeof window === 'undefined') return false
  return (window.location.pathname || '').includes('reset-password')
}

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback(async (session) => {
    const authUser = session?.user
    if (!authUser?.id) {
      setUser(null)
      return
    }

    const { ok, error } = await isPharmacistAppUser(supabase, authUser.id)
    if (error) {
      console.error('[AuthContext] Vérification rôle (get_current_app_role):', error)
      try {
        await supabase.auth.signOut()
      } catch {
        /* évite boucle si logout renvoie aussi 403 */
      }
      setUser(null)
      return
    }
    if (!ok) {
      try {
        await supabase.auth.signOut()
      } catch {
        /* idem */
      }
      setUser(null)
      return
    }

    setUser(authUser)
  }, [])

  useEffect(() => {
    let cancelled = false

    const boot = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (isResetPasswordPath() && session?.user) {
          setUser(session.user)
          return
        }
        await applySession(session ?? null)
      } catch (e) {
        console.error('[AuthContext] getSession échoue:', e)
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    boot()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY') {
        setUser(session?.user ?? null)
        setLoading(false)
        return
      }
      if (isResetPasswordPath() && session?.user) {
        setUser(session.user)
        setLoading(false)
        return
      }
      setLoading(true)
      applySession(session ?? null).finally(() => {
        if (!cancelled) setLoading(false)
      })
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [applySession])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  const value = {
    user,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
