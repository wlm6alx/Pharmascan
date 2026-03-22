import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { resolvePharmacyForPharmacist, getOperationalStatus } from '../lib/pharmacyHelpers'
import { Clock, Building2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function Status() {
  const { user } = useAuth()
  const [pharmacy, setPharmacy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchPharmacy()
  }, [user])

  const fetchPharmacy = async () => {
    try {
      if (!user?.id) return
      const { data: pharmacist } = await supabase
        .from('pharmacists')
        .select('*, pharmacies(*)')
        .eq('user_id', user.id)
        .single()

      const pharm = await resolvePharmacyForPharmacist(supabase, pharmacist)
      if (pharm) setPharmacy(pharm)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status) => {
    if (!pharmacy) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({ operational_status: status })
        .eq('id', pharmacy.id)

      if (error) throw error
      await fetchPharmacy()
      alert('Statut mis à jour avec succès')
    } catch (error) {
      alert('Erreur lors de la mise à jour: ' + error.message)
    } finally {
      setUpdating(false)
    }
  }

  const toggleOnDuty = async () => {
    if (!pharmacy) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('pharmacies')
        .update({ is_on_duty: !pharmacy.is_on_duty })
        .eq('id', pharmacy.id)

      if (error) throw error
      await fetchPharmacy()
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="text-yellow-800 font-medium">Aucune pharmacie associée</p>
            <p className="text-yellow-700 text-sm mt-1">
              Veuillez créer votre pharmacie dans la section "Ma Pharmacie"
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Statut de la pharmacie</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Statut de validation */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Statut de validation
            </h2>
            {pharmacy.status === 'approved' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-4 w-4 mr-1" />
                Validée
              </span>
            ) : pharmacy.status === 'pending' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <Clock className="h-4 w-4 mr-1" />
                En attente
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                <XCircle className="h-4 w-4 mr-1" />
                Rejetée
              </span>
            )}
          </div>

          <p className="text-gray-600 text-sm mb-4">
            {pharmacy.status === 'approved'
              ? 'Votre pharmacie a été validée par l\'administrateur. Vous pouvez maintenant gérer vos médicaments.'
              : pharmacy.status === 'pending'
              ? 'Votre demande de création de pharmacie est en attente de validation par l\'administrateur.'
              : 'Votre pharmacie a été rejetée. Veuillez contacter l\'administrateur pour plus d\'informations.'}
          </p>

          {pharmacy.status === 'approved' && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Pharmacie:</strong> {pharmacy.name}
              </p>
              <p className="text-sm text-green-700 mt-1">
                <strong>Adresse:</strong> {pharmacy.address}
              </p>
            </div>
          )}
        </div>

        {/* Pharmacie de garde */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Pharmacie de garde
            </h2>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                pharmacy.is_on_duty
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {pharmacy.is_on_duty ? 'De garde' : 'Non de garde'}
            </span>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            Activez le statut "de garde" lorsque votre pharmacie est ouverte en dehors des heures normales.
            Les utilisateurs pourront vous trouver plus facilement.
          </p>

          <button
            onClick={toggleOnDuty}
            disabled={updating || pharmacy.status !== 'approved'}
            className={`w-full px-4 py-3 rounded-lg font-medium transition ${
              pharmacy.is_on_duty
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {updating
              ? 'Mise à jour...'
              : pharmacy.is_on_duty
              ? 'Désactiver la garde'
              : 'Activer la garde'}
          </button>
        </div>
      </div>

      {/* Statut d'ouverture */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Statut d'ouverture</h2>
        <p className="text-gray-600 text-sm mb-4">
          Mettez à jour le statut d'ouverture de votre pharmacie pour informer les clients en temps réel.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {(() => {
            const op = getOperationalStatus(pharmacy)
            return (
              <>
                <button
                  type="button"
                  onClick={() => updateStatus('open')}
                  disabled={updating || pharmacy.status !== 'approved'}
                  className={`px-4 py-4 sm:px-6 rounded-lg border-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    op === 'open'
                      ? 'border-green-600 bg-green-100 text-green-900 ring-2 ring-green-500/30'
                      : 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <CheckCircle className="h-6 w-6 mx-auto mb-2" />
                  <div>Ouverte</div>
                </button>

                <button
                  type="button"
                  onClick={() => updateStatus('closed')}
                  disabled={updating || pharmacy.status !== 'approved'}
                  className={`px-4 py-4 sm:px-6 rounded-lg border-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    op === 'closed'
                      ? 'border-red-600 bg-red-100 text-red-900 ring-2 ring-red-500/30'
                      : 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  <XCircle className="h-6 w-6 mx-auto mb-2" />
                  <div>Fermée</div>
                </button>

                <button
                  type="button"
                  onClick={() => updateStatus('busy')}
                  disabled={updating || pharmacy.status !== 'approved'}
                  className={`px-4 py-4 sm:px-6 rounded-lg border-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    op === 'busy'
                      ? 'border-amber-500 bg-amber-100 text-amber-900 ring-2 ring-amber-500/30'
                      : 'border-yellow-500 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                  }`}
                >
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  <div>Occupée</div>
                </button>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

