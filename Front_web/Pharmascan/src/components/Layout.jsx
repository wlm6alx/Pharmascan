import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useEffect, useRef, useState } from 'react'
import { supabase, isDemoMode } from '../lib/supabase'
import {
  isPharmacyOpenForDisplay,
  PHARMACY_PROFILE_UPDATED_EVENT,
  resolvePharmacyForPharmacist,
} from '../lib/pharmacyHelpers'
import { mockStorage } from '../lib/mockData'
import { Bell, User, LogOut, Menu, X, Home, Pill, Building2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import PharmaScanLogo from './PharmaScanLogo'

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [pharmacyStatus, setPharmacyStatus] = useState(false)
  /** pending | approved | rejected — l’ouverture n’est autorisée qu’après validation admin */
  const [pharmacyValidationStatus, setPharmacyValidationStatus] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  /** Photo affichée à la place de l’icône profil (barre du haut) */
  const [pharmacyPhotoUrl, setPharmacyPhotoUrl] = useState(null)
  const [profilePhotoLoadFailed, setProfilePhotoLoadFailed] = useState(false)

  useEffect(() => {
    // Charger le statut de la pharmacie
    fetchPharmacyStatus()
    // Charger le nombre de notifications non lues
    fetchUnreadNotifications()
  }, [location, user])

  useEffect(() => {
    // Actualiser le nombre de notifications non lues périodiquement
    const interval = setInterval(() => {
      fetchUnreadNotifications()
    }, 30000) // Toutes les 30 secondes

    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    setProfilePhotoLoadFailed(false)
  }, [pharmacyPhotoUrl])

  useEffect(() => {
    // Gérer l'effet de scroll
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      setIsScrolled(scrollPosition > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchPharmacyStatus = async () => {
    try {
      if (isDemoMode) {
        const pharmacy = mockStorage.pharmacy
        setPharmacyStatus(isPharmacyOpenForDisplay(pharmacy))
        setPharmacyValidationStatus(pharmacy?.status ?? 'approved')
        setPharmacyPhotoUrl(pharmacy?.photo_url?.trim() || null)
      } else {
        const { data: pharmacist } = await supabase
          .from('pharmacists')
          .select('id, pharmacy_id')
          .eq('user_id', user?.id)
          .maybeSingle()

        const pharmacy = await resolvePharmacyForPharmacist(supabase, pharmacist)
        if (pharmacy) {
          setPharmacyStatus(isPharmacyOpenForDisplay(pharmacy))
          setPharmacyValidationStatus(pharmacy.status ?? null)
          setPharmacyPhotoUrl(pharmacy.photo_url?.trim() || null)
        } else {
          setPharmacyStatus(false)
          setPharmacyValidationStatus(null)
          setPharmacyPhotoUrl(null)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
      setPharmacyPhotoUrl(null)
    }
  }

  const fetchUnreadNotifications = async () => {
    try {
      if (isDemoMode) {
        // Mode démo : compter les notifications non lues dans mockStorage
        const unread = mockStorage.notifications.filter(n => !n.read).length
        setUnreadCount(unread)
      } else {
        // Mode production : utiliser Supabase
        const { data: pharmacist } = await supabase
          .from('pharmacists')
          .select('id, pharmacy_id')
          .eq('user_id', user?.id)
          .maybeSingle()

        const pharmacy = await resolvePharmacyForPharmacist(supabase, pharmacist)
        if (pharmacy?.id) {
          const { data, error } = await supabase
            .from('notifications')
            .select('id')
            .eq('pharmacy_id', pharmacy.id)
            .eq('read', false)

          if (!error) {
            setUnreadCount(data?.length || 0)
          }
        } else {
          setUnreadCount(0)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchPharmacyStatusRef = useRef(fetchPharmacyStatus)
  fetchPharmacyStatusRef.current = fetchPharmacyStatus
  const fetchUnreadNotificationsRef = useRef(fetchUnreadNotifications)
  fetchUnreadNotificationsRef.current = fetchUnreadNotifications

  useEffect(() => {
    const onProfileUpdated = () => {
      fetchPharmacyStatusRef.current()
      fetchUnreadNotificationsRef.current()
    }
    window.addEventListener(PHARMACY_PROFILE_UPDATED_EVENT, onProfileUpdated)
    return () => window.removeEventListener(PHARMACY_PROFILE_UPDATED_EVENT, onProfileUpdated)
  }, [])

  const canToggleOperational =
    isDemoMode || pharmacyValidationStatus === 'approved'

  /** Tant que la pharmacie n’est pas approuvée, on n’affiche pas ouvert/fermé issu de la BDD (souvent trompeur). */
  const operationalDisplay = (() => {
    if (canToggleOperational) {
      return {
        line: pharmacyStatus ? '● Ouvert' : '● Fermé',
        lineClass: pharmacyStatus ? 'text-green-600' : 'text-red-500',
        switchOn: pharmacyStatus,
      }
    }
    if (pharmacyValidationStatus === 'pending') {
      return {
        line: '● En attente de validation',
        lineClass: 'text-amber-700',
        switchOn: false,
      }
    }
    if (pharmacyValidationStatus === 'rejected') {
      return {
        line: '● Non validée',
        lineClass: 'text-red-600',
        switchOn: false,
      }
    }
    return {
      line: '● —',
      lineClass: 'text-gray-500',
      switchOn: false,
    }
  })()

  const togglePharmacyStatus = async () => {
    if (!canToggleOperational) {
      alert(
        'Tant que votre pharmacie n’est pas validée par un administrateur, vous ne pouvez pas indiquer le statut d’ouverture.'
      )
      return
    }
    try {
      if (isDemoMode) {
        // Mode démo : mettre à jour mockStorage
        const newStatus = !pharmacyStatus
        if (mockStorage.pharmacy) {
          mockStorage.pharmacy.operational_status = newStatus ? 'open' : 'closed'
          mockStorage.pharmacy.is_on_duty = newStatus
        }
        setPharmacyStatus(newStatus)
      } else {
        // Mode production : utiliser Supabase
        const { data: pharmacist } = await supabase
          .from('pharmacists')
          .select('id, pharmacy_id')
          .eq('user_id', user?.id)
          .maybeSingle()

        const pharmacy = await resolvePharmacyForPharmacist(supabase, pharmacist)
        if (pharmacy?.id) {
          const nextOpen = !pharmacyStatus
          const { error } = await supabase
            .from('pharmacies')
            .update({ operational_status: nextOpen ? 'open' : 'closed' })
            .eq('id', pharmacy.id)

          if (error) {
            console.error(error)
            alert('Impossible de mettre à jour le statut : ' + error.message)
            return
          }
          setPharmacyStatus(nextOpen)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar beige avec effet de scroll dynamique */}
      <div className={`fixed top-0 left-0 right-0 h-14 flex items-center px-4 border-b z-30 transition-all duration-300 ${
        isScrolled 
          ? 'bg-beige-DEFAULT/95 backdrop-blur-md shadow-lg border-beige-dark' 
          : 'bg-beige-DEFAULT border-beige-dark'
      }`}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="mr-4 p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-beige-light transition-colors"
          aria-label="Ouvrir le menu"
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        {/* Logo */}
        <div className="flex items-center">
          <PharmaScanLogo variant="sidebar" />
        </div>
        <div className="ml-auto flex items-center gap-3 sm:gap-6">
          <Link to="/notifications" className="relative flex flex-col items-center hover:opacity-80 transition">
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            <span className="text-xs text-gray-600 mt-1 lowercase hidden sm:block">notifications</span>
          </Link>
          <Link
            to="/profile"
            className="flex flex-col items-center hover:opacity-80 transition"
            title="Profil"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-beige-dark bg-gray-100 flex items-center justify-center shrink-0 shadow-sm">
              {pharmacyPhotoUrl && !profilePhotoLoadFailed ? (
                <img
                  key={pharmacyPhotoUrl}
                  src={pharmacyPhotoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={() => setProfilePhotoLoadFailed(true)}
                />
              ) : (
                <User className="h-4 w-4 text-gray-600" aria-hidden />
              )}
            </div>
            <span className="text-xs text-gray-600 mt-1 lowercase hidden sm:block">profil</span>
          </Link>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex flex-col items-center hover:opacity-80 transition"
            title="Déconnexion"
          >
            <LogOut className="h-5 w-5 text-gray-600" />
            <span className="text-xs text-gray-600 mt-1 lowercase hidden sm:block">déconnexion</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 relative">
        {/* Overlay avec animation */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-60 z-40 backdrop-blur-sm transition-opacity duration-500"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}
        
        {/* Off-canvas Menu - Slide-out */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-br from-white via-beige-light to-beige-DEFAULT min-h-screen transform transition-transform duration-500 ease-out shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}>
          {/* En-tête avec bouton fermer */}
          <div className="p-4 border-b-2 border-beige-dark bg-white/90 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">Menu</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-red-200 hover:border-red-300"
                aria-label="Fermer le menu"
              >
                <X className="h-6 w-6 font-bold" />
              </button>
            </div>
          </div>

          {/* Navigation - Section principale avec animation slide */}
          <nav className="flex-1 p-6 space-y-3 mt-4 overflow-y-auto">
            <Link
              to="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 font-bold transform hover:scale-105 ${
                location.pathname === '/dashboard'
                  ? 'bg-[#0b8fac] text-white shadow-xl shadow-[#0b8fac]/50 scale-105 border-2 border-[#0b8fac]'
                  : 'bg-white text-gray-900 hover:bg-[#0b8fac] hover:text-white hover:shadow-xl border-2 border-gray-300 hover:border-[#0b8fac] shadow-md'
              }`}
            >
              <div className={`p-2.5 rounded-lg ${location.pathname === '/dashboard' ? 'bg-white/20' : 'bg-[#0b8fac]/10 group-hover:bg-white/20'}`}>
                <Home className={`h-5 w-5 ${location.pathname === '/dashboard' ? 'text-white' : 'text-[#0b8fac] group-hover:text-white'}`} />
              </div>
              <span className="text-base font-semibold">accueil</span>
            </Link>
            
            <Link
              to="/medications"
              onClick={() => setSidebarOpen(false)}
              className={`group flex items-center gap-4 px-5 py-4 rounded-xl transition-all duration-300 font-bold transform hover:scale-105 ${
                location.pathname === '/medications'
                  ? 'bg-[#0b8fac] text-white shadow-xl shadow-[#0b8fac]/50 scale-105 border-2 border-[#0b8fac]'
                  : 'bg-white text-gray-900 hover:bg-[#0b8fac] hover:text-white hover:shadow-xl border-2 border-gray-300 hover:border-[#0b8fac] shadow-md'
              }`}
            >
              <div className={`p-2.5 rounded-lg ${location.pathname === '/medications' ? 'bg-white/20' : 'bg-[#0b8fac]/10 group-hover:bg-white/20'}`}>
                <Pill className={`h-5 w-5 ${location.pathname === '/medications' ? 'text-white' : 'text-[#0b8fac] group-hover:text-white'}`} />
              </div>
              <span className="text-base font-semibold">médicaments</span>
            </Link>
          </nav>

          {/* Statut de la pharmacie - Section en bas avec animation */}
          <div className="p-6 border-t-2 border-beige-dark bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-mint-DEFAULT/10 rounded-lg">
                <Building2 className="h-5 w-5 text-mint-DEFAULT" />
              </div>
              <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                statut de la pharmacie
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-gray-800 mb-1">fermé/ouvert</span>
                  <span className={`text-xs font-bold ${operationalDisplay.lineClass}`}>
                    {operationalDisplay.line}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={togglePharmacyStatus}
                  disabled={!canToggleOperational}
                  className={`relative inline-flex h-9 w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-mint-DEFAULT focus:ring-offset-2 shadow-lg ${
                    canToggleOperational ? 'hover:shadow-xl' : 'cursor-not-allowed opacity-50'
                  } ${
                    operationalDisplay.switchOn ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 hover:bg-gray-500'
                  }`}
                  title={
                    !canToggleOperational
                      ? 'Validation administrateur requise avant ouvert / fermé'
                      : pharmacyStatus
                        ? 'Fermer la pharmacie'
                        : 'Ouvrir la pharmacie'
                  }
                >
                  <span
                    className={`inline-block h-7 w-7 transform rounded-full bg-white shadow-xl transition-transform duration-300 ${
                      operationalDisplay.switchOn ? 'translate-x-8' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {!canToggleOperational && pharmacyValidationStatus === 'pending' && (
                <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Ouvert / fermé sera disponible après <strong>validation</strong> de votre pharmacie par un administrateur.
                </p>
              )}
              {!canToggleOperational && pharmacyValidationStatus === 'rejected' && (
                <p className="mt-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Pharmacie non validée. Contactez l’administrateur.
                </p>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-white min-h-screen pt-14 overflow-auto">
          {children}
        </main>
      </div>

      {/* Modal de confirmation de déconnexion */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 relative shadow-2xl border-2 border-gray-100 animate-slide-up">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Confirmer la déconnexion
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              Êtes-vous sûr de vouloir vous déconnecter ?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-6 py-3.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-gray-300 hover:border-gray-400"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  await signOut()
                  navigate('/login')
                }}
                className="flex-1 px-6 py-3.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-red-600 hover:border-red-700 transform hover:scale-105"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
