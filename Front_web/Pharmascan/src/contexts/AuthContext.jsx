import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isDemoMode } from '../lib/supabase'
import { mockUser, mockStorage } from '../lib/mockData'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(isDemoMode ? null : null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoMode) {
      // Mode démo : vérifier le localStorage
      const demoUser = localStorage.getItem('demo_user')
      if (demoUser) {
        setUser(JSON.parse(demoUser))
      }
      setLoading(false)
    } else {
      // Mode production : utiliser Supabase
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (isDemoMode) {
      localStorage.removeItem('demo_user')
      setUser(null)
    } else {
      await supabase.auth.signOut()
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    signOut,
    isDemoMode,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
