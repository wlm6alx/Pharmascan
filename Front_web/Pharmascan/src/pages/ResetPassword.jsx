import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PharmaScanLogo from '../components/PharmaScanLogo'

const RESET_PASSWORD_ERROR_FR = {
  'New password should be different from the old password.':
    'Le nouveau mot de passe doit être différent de l’ancien.',
}

function toFrenchResetPasswordError(message) {
  const msg = String(message || '').trim()
  if (RESET_PASSWORD_ERROR_FR[msg]) return RESET_PASSWORD_ERROR_FR[msg]
  return msg.length > 0 ? msg : 'Impossible de mettre à jour le mot de passe.'
}

function passwordStrongEnough(pwd) {
  return (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pwd)
  )
}

/** Lien e-mail Supabase : #...&type=recovery ou flux PKCE ?type=recovery */
function isRecoveryUrl() {
  if (typeof window === 'undefined') return false
  const h = window.location.hash
  if (h.includes('type=recovery')) return true
  return /[?&]type=recovery(?:&|$)/.test(window.location.search)
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    const markReady = () => {
      if (!cancelled) {
        setReady(true)
        setChecking(false)
      }
    }

    if (isRecoveryUrl()) {
      markReady()
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY') {
        markReady()
        return
      }
      if (event === 'INITIAL_SESSION' && session?.user && isRecoveryUrl()) {
        markReady()
      }
      const onReset =
        typeof window !== 'undefined' && (window.location.pathname || '').includes('reset-password')
      if (event === 'SIGNED_IN' && session?.user && onReset) {
        markReady()
      }
    })

    const t = setTimeout(async () => {
      if (cancelled) return
      const { data: { session } } = await supabase.auth.getSession()
      const onResetRoute =
        typeof window !== 'undefined' && (window.location.pathname || '').includes('reset-password')
      if (session?.user && (isRecoveryUrl() || onResetRoute)) {
        markReady()
      } else if (!cancelled) {
        setChecking(false)
      }
    }, 600)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      clearTimeout(t)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    if (!passwordStrongEnough(password)) {
      setError(
        'Mot de passe trop faible : au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.'
      )
      return
    }
    setLoading(true)
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password })
      if (upErr) throw upErr
      setDone(true)
      await supabase.auth.signOut()
      setTimeout(() => {
        navigate('/login', { replace: true, state: { passwordReset: true } })
      }, 1200)
    } catch (err) {
      setError(toFrenchResetPasswordError(err?.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <PharmaScanLogo />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Nouveau mot de passe</h1>
        <p className="text-sm text-gray-600 text-center mb-8">
          Choisissez un mot de passe sécurisé pour votre compte pharmacie.
        </p>

        {checking && !ready && (
          <div className="flex flex-col items-center gap-3 py-10 text-gray-600">
            <Loader2 className="h-10 w-10 animate-spin text-[#0b8fac]" />
            <p className="text-sm">Vérification du lien…</p>
          </div>
        )}

        {!checking && !ready && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-900 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Lien invalide ou expiré</p>
              <p className="mt-1 text-amber-800/90">
                Ouvrez le lien reçu par e-mail depuis cette page, ou redemandez un lien depuis « Mot de passe oublié ».
                Vérifiez aussi que l’URL de redirection est autorisée dans Supabase (Authentication → URL configuration).
              </p>
            </div>
          </div>
        )}

        {done && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-800 text-sm">
            <CheckCircle className="h-5 w-5 shrink-0" />
            <span>Mot de passe mis à jour. Redirection vers la connexion…</span>
          </div>
        )}

        {ready && !done && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-2 text-red-700 text-sm">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mint-DEFAULT pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mint-DEFAULT"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mint-dark text-white py-3 rounded-lg font-medium hover:bg-mint-DEFAULT transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                'Enregistrer le mot de passe'
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-mint-DEFAULT hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
