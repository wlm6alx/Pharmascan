import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { isSupabaseConfigured } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Pharmacy from './pages/Pharmacy'
import Medications from './pages/Medications'
import Availability from './pages/Availability'
import Status from './pages/Status'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Layout>{children}</Layout>
}

function App() {
  return (
    <AuthProvider>
      {!isSupabaseConfigured && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Configuration Supabase invalide. Vérifie <code>VITE_SUPABASE_URL</code> et{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> dans le fichier <code>.env</code>.
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pharmacy"
          element={
            <ProtectedRoute>
              <Pharmacy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medications"
          element={
            <ProtectedRoute>
              <Medications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/availability"
          element={
            <ProtectedRoute>
              <Availability />
            </ProtectedRoute>
          }
        />
        <Route
          path="/status"
          element={
            <ProtectedRoute>
              <Status />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App

