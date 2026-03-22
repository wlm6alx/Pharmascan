import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, isDemoMode } from '../lib/supabase'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import PharmaScanLogo from '../components/PharmaScanLogo'
import { mockUser } from '../lib/mockData'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isDemoMode) {
        // Mode démo : accepter n'importe quel email/mot de passe
        const demoUser = {
          ...mockUser,
          email: email,
        }
        localStorage.setItem('demo_user', JSON.stringify(demoUser))
        // Recharger la page pour mettre à jour le contexte
        window.location.href = '/dashboard'
      } else {
        // Mode production : utiliser Supabase
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        // Vérifier si l'utilisateur est un pharmacien
        const { data: profile } = await supabase
          .from('pharmacists')
          .select('*')
          .eq('user_id', data.user.id)
          .single()

        if (!profile) {
          await supabase.auth.signOut()
          throw new Error('Accès réservé aux pharmaciens')
        }

        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-3/5 bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Élément circulaire en bas à gauche */}
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-mint-DEFAULT rounded-full opacity-20 -translate-x-1/2 translate-y-1/2"></div>

        <div className="w-full max-w-md px-4 sm:px-0">
          {/* Logo */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <PharmaScanLogo />
          </div>

          {/* Titre */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
            Se connecter
          </h1>

           {/*{isDemoMode && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {/*
                <strong>Mode démo activé :</strong> Utilisez n'importe quel email et mot de passe pour vous connecter.
                
              </p>
            </div>
          )}
          */}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de la pharmacie
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mint-DEFAULT focus:border-mint-DEFAULT outline-none transition"
                placeholder="Entrer votre email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mint-DEFAULT focus:border-mint-DEFAULT outline-none transition pr-12"
                  placeholder="Entrer votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Lien mot de passe oublié */}
            <div className="text-right">
              <Link
                to="#"
                className="text-sm text-mint-DEFAULT hover:text-mint-dark transition-colors duration-200 hover:underline"
              >
                Mot de passe oublié?
              </Link>
            </div>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mint-dark text-white py-3 rounded-lg font-medium hover:bg-mint-DEFAULT hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Lien d'inscription */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              vous n'avez pas de compte?{' '}
              <Link
                to="/register"
                className="text-[#4FD1C7] font-medium transition-all duration-200 hover:text-mint-dark hover:underline hover:bg-[#4FD1C7]/10 hover:px-2 hover:py-1 hover:rounded"
              >
                creez un nouveau compte
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Section droite - Fond coloré (40%) */}
      <div 
        className="lg:flex lg:w-2/5 hidden items-center justify-center p-8 relative overflow-hidden"
        style={{ 
          backgroundColor: '#4FD1C7',
          minHeight: '100vh'
        }}
      >
        {/* Éléments décoratifs animés en continu */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float-delayed"></div>
        <div className="absolute top-1/2 right-20 w-20 h-20 bg-white/5 rounded-full blur-lg animate-float-slow"></div>
        <div className="absolute bottom-1/3 left-20 w-16 h-16 bg-white/8 rounded-full blur-md animate-float-delayed-slow"></div>
        
        <div className="max-w-md text-white relative z-10 text-center lg:text-left">
          <h2 className="text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="inline-block animate-fade-slide-up">Bienvenue sur</span>
            <br />
            <span className="inline-block mt-3 animate-fade-slide-up-delayed animate-glow-text-continuous">
              PharmaScan
            </span>
          </h2>
          <p className="text-2xl lg:text-3xl font-semibold opacity-95 animate-fade-slide-up-delayed-2 mt-6">
          Votre santé à portée de main
          </p>
        </div>
      </div>
    </div>
  )
}
