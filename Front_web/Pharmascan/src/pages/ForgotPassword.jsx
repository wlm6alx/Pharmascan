import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PharmaScanLogo from '../components/PharmaScanLogo'

const RESET_ERROR_FR = {
  'User not found': 'Aucun compte ne correspond à cet e-mail.',
  'Email rate limit exceeded': "Trop de demandes. Merci d'attendre quelques minutes.",
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      })

      if (resetError) throw resetError
      setSuccess('Un lien de réinitialisation a été envoyé à votre adresse e-mail.')
    } catch (err) {
      const msg = String(err?.message || '').trim()
      setError(RESET_ERROR_FR[msg] || "Impossible d'envoyer le lien pour le moment. Réessayez plus tard.")
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
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Mot de passe oublié</h1>
        <p className="text-sm text-gray-600 text-center mb-8">
          Saisissez votre e-mail pour recevoir un lien de réinitialisation.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email de la pharmacie</label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mint-DEFAULT focus:border-mint-DEFAULT outline-none transition"
              placeholder="Entrer votre email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mint-dark text-white py-3 rounded-lg font-medium hover:bg-mint-DEFAULT transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Envoi...' : 'Envoyer le lien'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-mint-DEFAULT hover:text-mint-dark hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}
