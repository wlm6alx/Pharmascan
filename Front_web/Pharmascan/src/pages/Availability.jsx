import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Package, Search, CheckCircle, XCircle, Edit } from 'lucide-react'

export default function Availability() {
  const { user } = useAuth()
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchMedications()
  }, [user])

  const fetchMedications = async () => {
    try {
      const { data: pharmacist } = await supabase
        .from('pharmacists')
        .select('pharmacy_id')
        .eq('user_id', user.id)
        .single()

      if (pharmacist?.pharmacy_id) {
        const { data, error } = await supabase
          .from('medications')
          .select('*')
          .eq('pharmacy_id', pharmacist.pharmacy_id)
          .order('name', { ascending: true })

        if (error) throw error
        setMedications(data || [])
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (medication) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({ available: !medication.available })
        .eq('id', medication.id)

      if (error) throw error
      fetchMedications()
    } catch (error) {
      alert('Erreur lors de la mise à jour: ' + error.message)
    }
  }

  const updateQuantity = async (medication, newQuantity) => {
    try {
      const { error } = await supabase
        .from('medications')
        .update({ 
          quantity: parseInt(newQuantity) || 0,
          available: parseInt(newQuantity) > 0
        })
        .eq('id', medication.id)

      if (error) throw error
      fetchMedications()
    } catch (error) {
      alert('Erreur lors de la mise à jour: ' + error.message)
    }
  }

  const filteredMedications = medications.filter((med) =>
    med.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.barcode?.includes(searchTerm)
  )

  const availableCount = medications.filter(m => m.available).length
  const outOfStockCount = medications.filter(m => !m.available).length

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Gestion de la disponibilité</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total médicaments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{medications.length}</p>
            </div>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Disponibles</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{availableCount}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ruptures de stock</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{outOfStockCount}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un médicament..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Médicament
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMedications.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    Aucun médicament trouvé
                  </td>
                </tr>
              ) : (
                filteredMedications.map((medication) => (
                  <tr key={medication.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{medication.name}</div>
                        {medication.dosage && (
                          <div className="text-sm text-gray-500">{medication.dosage}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        value={medication.quantity || 0}
                        onChange={(e) => updateQuantity(medication, e.target.value)}
                        onBlur={(e) => {
                          if (e.target.value !== (medication.quantity || 0).toString()) {
                            updateQuantity(medication, e.target.value)
                          }
                        }}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {medication.available ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Disponible
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Rupture
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleAvailability(medication)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          medication.available
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {medication.available ? 'Marquer rupture' : 'Marquer disponible'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}



