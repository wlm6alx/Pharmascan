import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isDemoMode } from '../lib/supabase'
import { mockStorage } from '../lib/mockData'
import {
  isMedicationExpired,
  expirationDateSortKey,
  formatExpirationMonthYear,
} from '../lib/medicationDates'
import { X } from 'lucide-react'

const LOW_STOCK_THRESHOLD = 10
const ROW_BAR_COLORS = ['bg-[#0b8fac]', 'bg-sky-600', 'bg-slate-600', 'bg-violet-500', 'bg-emerald-600', 'bg-amber-500']
const CATEGORY_COLORS = ['#0b8fac', '#0284c7', '#475569', '#7c3aed', '#059669', '#d97706']

function computeStats(medications) {
  const list = medications || []
  const total = list.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0)
  const low = list.filter((m) => (Number(m.quantity) || 0) < LOW_STOCK_THRESHOLD).length
  const expired = list.filter((m) => isMedicationExpired(m)).length
  return { totalStock: total, lowStock: low, expiredStock: expired }
}

function topMedicationsByQuantity(medications, limit = 6) {
  const list = [...(medications || [])].sort(
    (a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0)
  )
  return list.slice(0, limit)
}

function categoryDistribution(medications) {
  const list = medications || []
  if (list.length === 0) return []
  const counts = {}
  list.forEach((m) => {
    const key = (m.category && String(m.category).trim()) || 'Sans catégorie'
    counts[key] = (counts[key] || 0) + 1
  })
  const total = list.length
  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      pct: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count)
}

export default function Dashboard() {
  const { user } = useAuth()
  const [medications, setMedications] = useState([])
  const [stats, setStats] = useState({
    totalStock: 0,
    lowStock: 0,
    expiredStock: 0,
  })
  const [loading, setLoading] = useState(true)
  const [showLowStockModal, setShowLowStockModal] = useState(false)
  const [showExpiredModal, setShowExpiredModal] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      if (isDemoMode) {
        const meds = mockStorage.medications
        setMedications(meds)
        setStats(computeStats(meds))
      } else if (user?.id) {
        const { data: pharmacist } = await supabase
          .from('pharmacists')
          .select('pharmacy_id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (!pharmacist?.pharmacy_id) {
          setMedications([])
          setStats(computeStats([]))
        } else {
          const { data, error } = await supabase
            .from('medications')
            .select('*')
            .eq('pharmacy_id', pharmacist.pharmacy_id)
            .order('created_at', { ascending: false })

          if (error) throw error
          const meds = data || []
          setMedications(meds)
          setStats(computeStats(meds))
        }
      } else {
        setMedications([])
        setStats(computeStats([]))
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMedications([])
      setStats(computeStats([]))
    } finally {
      setLoading(false)
    }
  }

  const topMeds = useMemo(() => topMedicationsByQuantity(medications, 6), [medications])
  const maxQty = useMemo(
    () => Math.max(1, ...topMeds.map((m) => Number(m.quantity) || 0)),
    [topMeds]
  )

  const categories = useMemo(() => categoryDistribution(medications), [medications])

  const lowStockMedications = useMemo(() => {
    return [...(medications || [])]
      .filter((m) => (Number(m.quantity) || 0) < LOW_STOCK_THRESHOLD)
      .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))
  }, [medications])

  const expiredMedications = useMemo(() => {
    return [...(medications || [])]
      .filter(isMedicationExpired)
      .sort((a, b) => expirationDateSortKey(a.expiration_date) - expirationDateSortKey(b.expiration_date))
  }, [medications])

  const maxCategoryCount = useMemo(
    () => Math.max(1, ...categories.map((c) => c.count)),
    [categories]
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
          Bienvenue
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Vue d'ensemble de votre pharmacie
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Chargement des statistiques…</p>
      ) : null}

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
          <p className="text-xs text-blue-600 mt-2">unités en stock (somme des quantités)</p>
        </div>

        <button
          type="button"
          onClick={() => setShowLowStockModal(true)}
          className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-lg p-6 border border-red-200 hover:shadow-xl hover:ring-2 hover:ring-red-300/60 transition-all duration-300 transform hover:-translate-y-1 text-left w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          aria-label={`Voir le détail du stock faible : ${stats.lowStock} ligne(s)`}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-red-700 uppercase tracking-wide">Stock faible</p>
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <p className="text-5xl font-bold text-red-700">{stats.lowStock}</p>
          <p className="text-xs text-red-600 mt-2">
            lignes avec quantité &lt; {LOW_STOCK_THRESHOLD}
          </p>
          <p className="text-xs font-medium text-red-800/80 mt-3 underline decoration-red-400/80 underline-offset-2">
            Cliquer pour voir les médicaments concernés
          </p>
        </button>

        <button
          type="button"
          onClick={() => setShowExpiredModal(true)}
          className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl hover:ring-2 hover:ring-green-300/60 transition-all duration-300 transform hover:-translate-y-1 text-left w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          aria-label={`Voir le détail du stock expiré : ${stats.expiredStock} médicament(s)`}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-green-700 uppercase tracking-wide">Stock expiré</p>
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-5xl font-bold text-green-700">{stats.expiredStock}</p>
          <p className="text-xs text-green-600 mt-2">médicaments dont le mois d’expiration est dépassé</p>
          <p className="text-xs font-medium text-green-800/80 mt-3 underline decoration-green-400/80 underline-offset-2">
            Cliquer pour voir les médicaments concernés
          </p>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6">
          <h2 className="mb-1 flex items-center text-lg font-bold text-gray-900 sm:text-xl">
            <span className="mr-3 h-8 w-1 shrink-0 rounded-full bg-[#0b8fac]" />
            Classement par stock
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Jusqu’à 6 produits avec le plus d’unités. Les ventes ne sont pas suivies dans l’application.
          </p>
          {topMeds.length === 0 ? (
            <p className="py-12 text-center text-gray-500">Aucun médicament enregistré.</p>
          ) : (
            <ul className="space-y-3">
              {topMeds.map((m, i) => {
                const q = Number(m.quantity) || 0
                const widthPct = Math.round((q / maxQty) * 100)
                return (
                  <li
                    key={m.id || i}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-200">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-medium leading-snug text-gray-900">
                            {m.name || 'Sans nom'}
                          </p>
                          {m.dosage ? (
                            <p className="mt-0.5 text-xs text-gray-500">{m.dosage}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-lg font-semibold tabular-nums text-[#0b8fac] sm:text-xl">
                          {q}
                        </span>
                        <span className="ml-0.5 text-xs font-normal text-gray-500">u.</span>
                      </div>
                    </div>
                    <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-200/90">
                      <div
                        className={`h-full rounded-full transition-all ${ROW_BAR_COLORS[i % ROW_BAR_COLORS.length]}`}
                        style={{ width: `${Math.max(widthPct, 3)}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:p-6">
          <h2 className="mb-1 flex items-center text-lg font-bold text-gray-900 sm:text-xl">
            <span className="mr-3 h-8 w-1 shrink-0 rounded-full bg-[#0b8fac]" />
            Graphique par catégorie
          </h2>
          <p className="mb-4 text-sm text-gray-500">
            Nombre de <strong>fiches</strong> médicaments par catégorie (une ligne = une fiche).
          </p>
          {categories.length === 0 ? (
            <p className="py-12 text-center text-gray-500">
              Ajoutez une catégorie sur vos médicaments pour afficher le graphique.
            </p>
          ) : (
            <div className="space-y-5">
              <div className="overflow-x-auto rounded-xl bg-gradient-to-b from-gray-50 to-white p-3 ring-1 ring-gray-100 sm:p-4">
                <div
                  className="flex min-h-[200px] w-full items-end justify-center gap-2 sm:min-h-[220px] sm:gap-4"
                  style={
                    categories.length > 4 ? { minWidth: `${categories.length * 72}px` } : undefined
                  }
                >
                  {categories.map((c, i) => {
                    const barH = Math.max(
                      16,
                      Math.round((c.count / maxCategoryCount) * 160)
                    )
                    return (
                      <div
                        key={c.name}
                        className="flex min-w-[56px] max-w-[120px] flex-1 flex-col items-center justify-end sm:min-w-[72px]"
                      >
                        <span className="mb-1 text-xs font-bold tabular-nums text-[#0b8fac] sm:text-sm">
                          {c.count}
                        </span>
                        <div
                          className="w-full max-w-[72px] rounded-t-md shadow-sm transition-all"
                          style={{
                            height: `${barH}px`,
                            backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          }}
                          title={`${c.name}: ${c.count} fiche(s)`}
                        />
                        <p className="mt-2 max-w-full px-0.5 text-center text-[10px] leading-tight text-gray-600 sm:text-xs">
                          <span className="line-clamp-3 break-words">{c.name}</span>
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  Légende
                </p>
                <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  {categories.map((c, i) => (
                    <li
                      key={c.name}
                      className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1.5 ring-1 ring-gray-100"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-sm"
                          style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                        />
                        <span className="truncate font-medium text-gray-800" title={c.name}>
                          {c.name}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-gray-600">
                        {c.count} fiche{c.count > 1 ? 's' : ''}{' '}
                        <span className="text-gray-400">({c.pct.toFixed(0)}%)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLowStockModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={() => setShowLowStockModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="low-stock-modal-title"
            className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="low-stock-modal-title" className="text-lg font-bold text-gray-900 sm:text-xl">
                  Médicaments — stock faible
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Quantité strictement inférieure à {LOW_STOCK_THRESHOLD} unités
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLowStockModal(false)}
                className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 sm:px-6">
              {lowStockMedications.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  Aucun médicament en stock faible pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {lowStockMedications.map((m) => {
                    const q = Number(m.quantity) || 0
                    return (
                      <li key={m.id} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{m.name || 'Sans nom'}</p>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            {m.dosage ? <span>{m.dosage}</span> : null}
                            {m.category ? <span>{m.category}</span> : null}
                            {m.form ? <span>{m.form}</span> : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:text-right">
                          <span className="text-xs text-gray-500 sm:hidden">Quantité</span>
                          <span className="inline-flex min-w-[3rem] items-center justify-end rounded-lg bg-red-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-red-700 ring-1 ring-red-100">
                            {q}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-gray-100 px-5 py-3 sm:px-6">
              <Link
                to="/medications"
                onClick={() => setShowLowStockModal(false)}
                className="text-sm font-semibold text-[#0b8fac] hover:underline"
              >
                Ouvrir la page Médicaments
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {showExpiredModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-label="Fermer"
            onClick={() => setShowExpiredModal(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="expired-stock-modal-title"
            className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl border border-green-200 bg-white shadow-2xl flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
              <div>
                <h2 id="expired-stock-modal-title" className="text-lg font-bold text-gray-900 sm:text-xl">
                  Médicaments — stock expiré
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Mois / année d’expiration dépassés (produit considéré expiré après la fin de ce mois)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpiredModal(false)}
                className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 sm:px-6">
              {expiredMedications.length === 0 ? (
                <p className="py-8 text-center text-gray-500">
                  Aucun médicament expiré pour le moment.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {expiredMedications.map((m) => {
                    const q = Number(m.quantity) || 0
                    const expLabel = m.expiration_date
                      ? formatExpirationMonthYear(m.expiration_date)
                      : '—'
                    return (
                      <li
                        key={m.id}
                        className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">{m.name || 'Sans nom'}</p>
                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                            {m.dosage ? <span>{m.dosage}</span> : null}
                            {m.category ? <span>{m.category}</span> : null}
                            {m.form ? <span>{m.form}</span> : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
                          <span className="text-xs font-medium uppercase tracking-wide text-amber-800">
                            Expiration
                          </span>
                          <span className="inline-flex rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-amber-900 ring-1 ring-amber-200">
                            {expLabel}
                          </span>
                          <span className="text-xs text-gray-500">
                            Qté : <span className="font-semibold tabular-nums text-gray-700">{q}</span>
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="border-t border-gray-100 px-5 py-3 sm:px-6">
              <Link
                to="/medications"
                onClick={() => setShowExpiredModal(false)}
                className="text-sm font-semibold text-[#0b8fac] hover:underline"
              >
                Ouvrir la page Médicaments
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
