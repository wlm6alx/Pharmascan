import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { resolvePharmacyForPharmacist } from '../lib/pharmacyHelpers'
import { Building2, MapPin, Phone, Mail, Clock, CheckCircle, XCircle } from 'lucide-react'

export default function Pharmacy() {
  const { user } = useAuth()
  const [pharmacy, setPharmacy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    is_on_duty: false,
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
      const { data: pharmacist } = await supabase
        .from('pharmacists')
        .select('*, pharmacies(*)')
        .eq('user_id', user.id)
        .single()

      const pharm = await resolvePharmacyForPharmacist(supabase, pharmacist)
      if (pharm) {
        setPharmacy(pharm)
        setFormData({
          name: pharm.name || '',
          address: pharm.address || '',
          phone: pharm.phone || '',
          email: pharm.email || '',
          is_on_duty: pharm.is_on_duty || false,
        })
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }


  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const pid = pharmacy?.id
      if (!pid) {
        alert('Pharmacie introuvable. Rechargez la page.')
        return
      }
      const { error } = await supabase
        .from('pharmacies')
        .update({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          is_on_duty: formData.is_on_duty,
        })
        .eq('id', pid)

      if (error) throw error

      await fetchPharmacy()
      setEditing(false)
      alert('Pharmacie mise à jour avec succès')
    } catch (error) {
      alert('Erreur lors de la mise à jour: ' + error.message)
    }
  }

  const handleCreatePharmacy = async (e) => {
    e.preventDefault()
    try {
      const { data: pharmacist } = await supabase
        .from('pharmacists')
        .select('id')
        .eq('user_id', user.id)
        .single()

      const { data, error } = await supabase
        .from('pharmacies')
        .insert({
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          email: formData.email,
          is_on_duty: formData.is_on_duty,
          pharmacist_id: pharmacist.id,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      await supabase
        .from('pharmacists')
        .update({ pharmacy_id: data.id })
        .eq('id', pharmacist.id)

      await fetchPharmacy()
      setEditing(false)
      alert('Pharmacie créée avec succès (en attente de validation)')
    } catch (error) {
      alert('Erreur lors de la création: ' + error.message)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>
  }

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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la pharmacie *
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse *
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>


            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_on_duty"
                checked={formData.is_on_duty}
                onChange={handleChange}
                className="h-4 w-4 text-mint-DEFAULT"
              />
              <label className="ml-2 text-sm text-gray-700">
                Pharmacie de garde
              </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de la pharmacie *
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse *
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>


              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_on_duty"
                  checked={formData.is_on_duty}
                  onChange={handleChange}
                  className="h-4 w-4 text-mint-DEFAULT"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Pharmacie de garde
                </label>
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
                    {pharmacy.status === 'approved' ? (
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
                    {pharmacy.is_on_duty && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Clock className="h-3 w-3 mr-1" />
                        De garde
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
                    <p className="text-gray-900">{pharmacy.address || 'Non définie'}</p>
                  </div>
                </div>

                {pharmacy.phone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Téléphone</p>
                      <p className="text-gray-900">{pharmacy.phone}</p>
                    </div>
                  </div>
                )}

                {pharmacy.email && (
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-gray-900">{pharmacy.email}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

