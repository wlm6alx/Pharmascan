import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  ensurePharmacistRow,
  resolvePharmacyForPharmacist,
  resolveOrCreatePharmacy,
  PHARMACY_PROFILE_UPDATED_EVENT,
} from '../lib/pharmacyHelpers'
import {
  getBrowserGeolocation,
  pharmacyValidationKey,
  splitPhoneForPharmacie,
  T_PHARMACIE,
  T_PHARMACIEN,
} from '../lib/pharmacySchema'
import { getPhoneCode } from '../lib/phoneCodes'
import { Building2, MapPin, Phone, Clock, CheckCircle } from 'lucide-react'

export default function Pharmacy() {
  const { user } = useAuth()
  const [pharmacy, setPharmacy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    adress: '',
    pays: '',
    ville: '',
    quartier: '',
    agrementnumber: '',
    phoneCode: '+237',
    phoneNumber: '',
    latitude: 0,
    longitude: 0,
  })

  useEffect(() => {
    fetchPharmacy()
  }, [user])

  const fetchPharmacy = async () => {
    try {
      if (!user?.id) {
        setLoading(false)
        return
      }
      const pharmacist = await ensurePharmacistRow(supabase, user)
      const pharm = await resolvePharmacyForPharmacist(supabase, pharmacist)
      if (pharm) {
        setPharmacy(pharm)
        const phone = String(pharm.phone_number ?? '')
        setFormData({
          name: pharm.name || '',
          adress: pharm.adress || '',
          pays: pharm.pays || '',
          ville: pharm.ville || '',
          quartier: pharm.quartier || '',
          agrementnumber: pharm.agrementnumber || '',
          phoneCode: pharm.indicphone || getPhoneCode('CM').code,
          phoneNumber: phone,
          latitude: pharm.latitude ?? 0,
          longitude: pharm.longitude ?? 0,
        })
      } else {
        setPharmacy(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const applyGeolocation = async () => {
    setGeoLoading(true)
    try {
      const { latitude, longitude } = await getBrowserGeolocation()
      setFormData((prev) => ({ ...prev, latitude, longitude }))
    } finally {
      setGeoLoading(false)
    }
  }

  const buildPayload = () => {
    const phone = splitPhoneForPharmacie(formData.phoneCode, formData.phoneNumber)
    return {
      name: formData.name.trim() || 'Pharmacie',
      adress: formData.adress.trim() || '—',
      pays: formData.pays.trim() || '—',
      ville: formData.ville.trim() || '—',
      quartier: formData.quartier.trim() || '—',
      agrementnumber: formData.agrementnumber.trim() || '—',
      indicphone: phone.indicphone,
      phone_number: phone.phone_number.toString(),
      latitude: Number(formData.latitude) || 0,
      longitude: Number(formData.longitude) || 0,
      localisation: 0,
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const pharmacist = await ensurePharmacistRow(supabase, user)
      if (!pharmacist) {
        alert('Profil pharmacien introuvable.')
        return
      }
      const payload = buildPayload()
      let row = await resolvePharmacyForPharmacist(supabase, pharmacist)

      if (!row) {
        row = await resolveOrCreatePharmacy(supabase, pharmacist, {
          ...payload,
          attestationPath: 'pending',
          justifPath: 'pending',
        })
      } else {
        const { error } = await supabase
          .from(T_PHARMACIE)
          .update(payload)
          .eq('pharmacie_id', row.pharmacie_id)
        if (error) throw error
      }

      await fetchPharmacy()
      window.dispatchEvent(new Event(PHARMACY_PROFILE_UPDATED_EVENT))
      setEditing(false)
      alert('Pharmacie mise à jour avec succès')
    } catch (error) {
      alert('Erreur lors de la mise à jour: ' + error.message)
    }
  }

  const handleCreatePharmacy = async (e) => {
    e.preventDefault()
    try {
      const pharmacist = await ensurePharmacistRow(supabase, user)
      if (!pharmacist) {
        alert('Profil pharmacien introuvable.')
        return
      }
      const payload = buildPayload()
      const { data, error } = await supabase
        .from(T_PHARMACIE)
        .insert({
          ...payload,
          attestationPath: 'pending',
          justifPath: 'pending',
          profile_path: null,
          status: 'close',
          validate: false,
          exist: true,
          created_for_user_id: user.id,
        })
        .select()
        .single()

      if (error) throw error

      await supabase
        .from(T_PHARMACIEN)
        .update({ pharmacie_id: data.pharmacie_id })
        .eq('user_id', user.id)

      await fetchPharmacy()
      window.dispatchEvent(new Event(PHARMACY_PROFILE_UPDATED_EVENT))
      setEditing(false)
      alert('Pharmacie créée (documents et validation à compléter depuis le profil)')
    } catch (error) {
      alert('Erreur lors de la création: ' + error.message)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  const vLabel = pharmacy ? pharmacyValidationKey(pharmacy) : null

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Ma Pharmacie</h1>
        {pharmacy && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-6 py-3 bg-mint-DEFAULT text-white rounded-lg hover:bg-mint-dark transition font-medium shadow-md hover:shadow-lg"
          >
            Modifier
          </button>
        )}
      </div>

      {!pharmacy ? (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8">
          <h2 className="text-xl font-semibold mb-4">Créer ma pharmacie</h2>
          <form onSubmit={handleCreatePharmacy} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">N° agrément *</label>
                <input
                  type="text"
                  name="agrementnumber"
                  value={formData.agrementnumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Adresse *</label>
              <input
                type="text"
                name="adress"
                value={formData.adress}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pays *</label>
                <input
                  type="text"
                  name="pays"
                  value={formData.pays}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quartier *</label>
              <input
                type="text"
                name="quartier"
                value={formData.quartier}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Indicatif</label>
                <input
                  type="text"
                  name="phoneCode"
                  value={formData.phoneCode}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro (chiffres)</label>
                <input
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Latitude / longitude</label>
                <p className="text-sm text-gray-600">
                  {formData.latitude}, {formData.longitude}
                </p>
              </div>
              <button
                type="button"
                onClick={applyGeolocation}
                disabled={geoLoading}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {geoLoading ? 'Localisation…' : 'Utiliser ma position'}
              </button>
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-mint-DEFAULT text-white rounded-lg hover:bg-mint-dark transition font-medium shadow-md hover:shadow-lg"
            >
              Créer la pharmacie
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 lg:p-8">
          {editing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">N° agrément *</label>
                  <input
                    type="text"
                    name="agrementnumber"
                    value={formData.agrementnumber}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse *</label>
                <input
                  type="text"
                  name="adress"
                  value={formData.adress}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pays *</label>
                  <input
                    type="text"
                    name="pays"
                    value={formData.pays}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ville *</label>
                  <input
                    type="text"
                    name="ville"
                    value={formData.ville}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quartier *</label>
                <input
                  type="text"
                  name="quartier"
                  value={formData.quartier}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Indicatif</label>
                  <input
                    type="text"
                    name="phoneCode"
                    value={formData.phoneCode}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Numéro</label>
                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude / longitude</label>
                  <p className="text-sm text-gray-600">
                    {formData.latitude}, {formData.longitude}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={applyGeolocation}
                  disabled={geoLoading}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {geoLoading ? 'Localisation…' : 'Mettre à jour la position'}
                </button>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-mint-DEFAULT text-white rounded-lg hover:bg-mint-dark transition font-medium shadow-md hover:shadow-lg"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    fetchPharmacy()
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium shadow-md hover:shadow-lg"
                >
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Building2 className="h-6 w-6 mr-2" />
                    {pharmacy.name}
                  </h2>
                  <div className="mt-2 flex items-center space-x-2">
                    {vLabel === 'approuvee' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Validée
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        En attente de validation
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Adresse</p>
                    <p className="text-gray-900">{pharmacy.adress || '—'}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {pharmacy.ville}, {pharmacy.quartier} — {pharmacy.pays}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Téléphone</p>
                    <p className="text-gray-900">
                      {pharmacy.indicphone} {pharmacy.phone_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 md:col-span-2">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Coordonnées GPS</p>
                    <p className="text-gray-900">
                      {pharmacy.latitude}, {pharmacy.longitude}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
