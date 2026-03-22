import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { isDemoMode } from '../lib/supabase'
import { mockMedications, mockStorage } from '../lib/mockData'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalStock: 0,
    lowStock: 0,
    expiredStock: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    try {
      if (isDemoMode) {
        // Mode démo : utiliser les données mockées
        const medications = mockStorage.medications
        const total = medications.reduce((sum, m) => sum + (m.quantity || 0), 0)
        const low = medications.filter(m => (m.quantity || 0) < 10).length
        const expired = medications.filter(m => {
          if (!m.expiration_date) return false
          return new Date(m.expiration_date) < new Date()
        }).length

        setStats({
          totalStock: total,
          lowStock: low,
          expiredStock: expired,
        })
      } else {
        // Mode production : utiliser Supabase
        // (code existant)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white min-h-screen">
      {/* En-tête de la page */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
          Bienvenue
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Vue d'ensemble de votre pharmacie
        </p>
      </div>

      {/* KPIs - Cartes statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Total stock</p>
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          <p className="text-5xl font-bold text-blue-900">{stats.totalStock}</p>
          <p className="text-xs text-blue-600 mt-2">médicaments en stock</p>
        </div>
        
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Stock faible</p>
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-5xl font-bold text-red-700">{stats.lowStock}</p>
          <p className="text-xs text-red-600 mt-2">nécessitent un réapprovisionnement</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Stock expiré</p>
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-5xl font-bold text-green-700">{stats.expiredStock}</p>
          <p className="text-xs text-green-600 mt-2">médicaments expirés</p>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique barres - Médicaments les plus vendus */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-gray-200 hover:shadow-xl transition-all duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="w-1 h-8 bg-mint-DEFAULT rounded-full mr-3"></div>
            Médicaments les plus vendus
          </h2>
          <div className="h-64 flex items-end justify-between gap-2">
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-blue-400 rounded-t" style={{ height: '75%' }}></div>
              <span className="text-xs text-gray-600 mt-2 text-center">Paracétamol</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-mint-DEFAULT rounded-t" style={{ height: '90%' }}></div>
              <span className="text-xs text-gray-600 mt-2 text-center">Ibuprofène</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-gray-800 rounded-t" style={{ height: '55%' }}></div>
              <span className="text-xs text-gray-600 mt-2 text-center">Amoxicilline</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-blue-300 rounded-t" style={{ height: '100%' }}></div>
              <span className="text-xs text-gray-600 mt-2 text-center">Aspirine</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-purple-300 rounded-t" style={{ height: '40%' }}></div>
              <span className="text-xs text-gray-600 mt-2 text-center">Loratadine</span>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-green-400 rounded-t" style={{ height: '65%' }}></div>
              <span className="text-xs text-gray-600 mt-2 text-center">Doliprane</span>
            </div>
          </div>
        </div>

        {/* Graphique donut - Catégorie de médicaments */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-gray-200 hover:shadow-xl transition-all duration-300">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <div className="w-1 h-8 bg-mint-DEFAULT rounded-full mr-3"></div>
            Catégorie de médicaments
          </h2>
          <div className="flex items-center justify-center h-64">
            <div className="relative w-48 h-48">
              {/* Donut chart simplifié */}
              <svg viewBox="0 0 200 200" className="transform -rotate-90">
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#1f2937"
                  strokeWidth="40"
                  strokeDasharray={`${52.1 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="40"
                  strokeDasharray={`${22.8 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`-${52.1 * 2.51}`}
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#4ade80"
                  strokeWidth="40"
                  strokeDasharray={`${13.9 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`-${(52.1 + 22.8) * 2.51}`}
                />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="40"
                  strokeDasharray={`${11.2 * 2.51} ${100 * 2.51}`}
                  strokeDashoffset={`-${(52.1 + 22.8 + 13.9) * 2.51}`}
                />
              </svg>
            </div>
            <div className="ml-8 space-y-2">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-800 rounded mr-2"></div>
                <span className="text-sm text-gray-700">analgésique: 52.1%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-400 rounded mr-2"></div>
                <span className="text-sm text-gray-700">anti-inflammatoire: 22.8%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-400 rounded mr-2"></div>
                <span className="text-sm text-gray-700">antibiotique: 13.9%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-600 rounded mr-2"></div>
                <span className="text-sm text-gray-700">antihistamique: 11.2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
