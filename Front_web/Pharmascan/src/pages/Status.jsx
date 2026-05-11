import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  ensurePharmacistRow,
  resolvePharmacyForPharmacist,
  getOperationalStatus,
  PHARMACY_PROFILE_UPDATED_EVENT,
} from '../lib/pharmacyHelpers'
import { NOTICE_NEED_PHARMACY } from '../components/SimpleNoticeModal'
import { pharmacyValidationKey, T_PHARMACIE } from '../lib/pharmacySchema'
import { Clock, Building2, CheckCircle, XCircle } from 'lucide-react'

export default function Status() {
  const { user } = useAuth()
  const [pharmacy, setPharmacy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchPharmacy()
  }, [user])

  useEffect(() => {
    const refresh = () => {
      if (user?.id) fetchPharmacy()
    }
    window.addEventListener(PHARMACY_PROFILE_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(PHARMACY_PROFILE_UPDATED_EVENT, refresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const fetchPharmacy = async () => {
    try {
      if (!user?.id) return
      const pharmacist = await ensurePharmacistRow(supabase, user)
      const pharm = await resolvePharmacyForPharmacist(supabase, pharmacist)
      if (pharm) setPharmacy(pharm)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const validationLabel = pharmacy ? pharmacyValidationKey(pharmacy) : null

  const updateOpenClose = async (open) => {
    if (!pharmacy?.pharmacie_id) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from(T_PHARMACIE)
        .update({ status: open ? 'open' : 'close' })
        .eq('pharmacie_id', pharmacy.pharmacie_id)

      if (error) throw error
      await fetchPharmacy()
      alert('Statut mis à jour avec succès')
    } catch (error) {
      alert('Erreur lors de la mise à jour: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  if (!pharmacy) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium leading-snug text-amber-900">{NOTICE_NEED_PHARMACY}</p>
          <Link
            to="/pharmacy"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#0b8fac] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a7085]"
          >
            Ma Pharmacie
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Statut de la pharmacie</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Statut de validation
            </h2>
            {validationLabel === 'approuvee' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Validée
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <Clock className="h-4 w-4 mr-1" />
                En attente
              </span>
            )}
          </div>

          <p className="text-gray-600 text-sm mb-4">
            {validationLabel === 'approuvee'
              ? "Votre pharmacie a été validée par l'administrateur. Vous pouvez indiquer si l'officine est ouverte ou fermée."
              : "Votre demande est en attente de validation par l'administrateur. L'ouverture / fermeture n'est disponible qu'après validation."}
          </p>

          {validationLabel === 'approuvee' && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Pharmacie:</strong> {pharmacy.name}
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Adresse:</strong> {pharmacy.adress}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Coordonnées enregistrées
            </h2>
          </div>
          <p className="text-gray-600 text-sm mb-2">
            Latitude : {pharmacy.latitude ?? '—'}, longitude : {pharmacy.longitude ?? '—'}
          </p>
          <p className="text-xs text-gray-500">
            Les coordonnées proviennent de la géolocalisation au moment de l&apos;inscription ou d&apos;une mise à jour depuis la fiche pharmacie.
          </p>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Statut d&apos;ouverture</h2>
        <p className="text-gray-600 text-sm mb-4">
          Schéma base : <code className="text-xs bg-gray-100 px-1 rounded">pharmacie.status</code> vaut{' '}
          <strong>open</strong> ou <strong>close</strong>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-xl">
          {(() => {
            const op = getOperationalStatus(pharmacy)
            return (
              <>
                <button
                  type="button"
                  onClick={() => updateOpenClose(true)}
                  disabled={updating || validationLabel !== 'approuvee'}
                  className={`px-4 py-4 sm:px-6 rounded-lg border-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    op === 'ouvert'
                      ? 'border-green-600 bg-green-100 text-green-900 ring-2 ring-green-500/30'
                      : 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                  <div>Ouverte</div>
                </button>

                <button
                  type="button"
                  onClick={() => updateOpenClose(false)}
                  disabled={updating || validationLabel !== 'approuvee'}
                  className={`px-4 py-4 sm:px-6 rounded-lg border-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    op === 'ferme'
                      ? 'border-red-600 bg-red-100 text-red-900 ring-2 ring-red-500/30'
                      : 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <XCircle className="h-6 w-6 mx-auto mb-2" />
                  <div>Fermée</div>
                </button>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
