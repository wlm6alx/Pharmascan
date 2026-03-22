import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isDemoMode } from '../lib/supabase'
import { mockStorage } from '../lib/mockData'
import { Plus, Search, Edit, Trash2, Filter, Calendar, X, AlertTriangle, Pill, Package, Barcode, Hash, Save, XCircle } from 'lucide-react'

export default function Medications() {
  const { user } = useAuth()
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingMedication, setEditingMedication] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [medicationToDelete, setMedicationToDelete] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    barcode: '',
    quantity: 0,
    productionDate: '',
    expirationDate: '',
    dosage: '',
    form: '',
    manufacturer: '',
  })

  useEffect(() => {
    if (isDemoMode) {
      // Mode démo : charger immédiatement
      setMedications([...mockStorage.medications])
    } else if (user?.id) {
      fetchMedications()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchMedications = async () => {
    if (!user?.id) return
    
    setLoading(true)
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
          .order('created_at', { ascending: false })

        if (error) throw error
        setMedications(data || [])
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
      [name]: name === 'quantity' ? parseInt(value) || 0 : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isDemoMode) {
        // Mode démo : utiliser mockStorage
        const medicationData = {
          id: editingMedication ? editingMedication.id : Date.now().toString(),
          name: formData.name,
          category: formData.category,
          barcode: formData.barcode,
          quantity: formData.quantity,
          production_date: formData.productionDate || null,
          expiration_date: formData.expirationDate || null,
          available: formData.quantity > 0,
          dosage: formData.dosage || '',
          form: formData.form || '',
          manufacturer: formData.manufacturer || '',
        }

        if (editingMedication) {
          const index = mockStorage.medications.findIndex(m => m.id === editingMedication.id)
          if (index !== -1) {
            mockStorage.medications[index] = medicationData
          }
          alert('Médicament mis à jour avec succès')
        } else {
          mockStorage.medications.push(medicationData)
          alert('Médicament ajouté avec succès')
        }
      } else {
        // Mode production : utiliser Supabase
        const { data: pharmacist } = await supabase
          .from('pharmacists')
          .select('pharmacy_id')
          .eq('user_id', user.id)
          .single()

        if (!pharmacist?.pharmacy_id) {
          alert('Veuillez d\'abord créer votre pharmacie')
          return
        }

        const medicationData = {
          name: formData.name,
          category: formData.category,
          barcode: formData.barcode,
          quantity: formData.quantity,
          production_date: formData.productionDate || null,
          expiration_date: formData.expirationDate || null,
          dosage: formData.dosage || '',
          form: formData.form || '',
          manufacturer: formData.manufacturer || '',
          price: formData.price || 0,
          pharmacy_id: pharmacist.pharmacy_id,
        }

        if (editingMedication) {
          const { error } = await supabase
            .from('medications')
            .update(medicationData)
            .eq('id', editingMedication.id)

          if (error) throw error
          alert('Médicament mis à jour avec succès')
        } else {
          const { error } = await supabase
            .from('medications')
            .insert(medicationData)

          if (error) throw error
          alert('Médicament ajouté avec succès')
        }
      }

      setShowModal(false)
      setEditingMedication(null)
      setFormData({
        name: '',
        category: '',
        barcode: '',
        quantity: 0,
        productionDate: '',
        expirationDate: '',
        dosage: '',
        form: '',
        manufacturer: '',
      })
      fetchMedications()
    } catch (error) {
      alert('Erreur: ' + error.message)
    }
  }

  const handleEdit = (medication) => {
    setEditingMedication(medication)
    setFormData({
      name: medication.name || '',
      category: medication.category || '',
      barcode: medication.barcode || '',
      quantity: medication.quantity || 0,
      productionDate: medication.production_date || '',
      expirationDate: medication.expiration_date || '',
      dosage: medication.dosage || '',
      form: medication.form || '',
      manufacturer: medication.manufacturer || '',
    })
    setShowModal(true)
  }

  const handleDeleteClick = (medication) => {
    setMedicationToDelete(medication)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!medicationToDelete) return

    try {
      if (isDemoMode) {
        // Mode démo : supprimer de mockStorage
        mockStorage.medications = mockStorage.medications.filter(m => m.id !== medicationToDelete.id)
      } else {
        // Mode production : utiliser Supabase
        const { error } = await supabase
          .from('medications')
          .delete()
          .eq('id', medicationToDelete.id)

        if (error) throw error
      }
      setShowDeleteConfirm(false)
      setMedicationToDelete(null)
      fetchMedications()
    } catch (error) {
      alert('Erreur lors de la suppression: ' + error.message)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setMedicationToDelete(null)
  }

  const filteredMedications = (medications || []).filter((med) => {
    if (!med) return false
    const searchLower = searchTerm.toLowerCase()
    return (
      med.name?.toLowerCase().includes(searchLower) ||
      med.barcode?.includes(searchTerm) ||
      med.category?.toLowerCase().includes(searchLower)
    )
  })


  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen w-full">
      {/* En-tête avec titre et bouton */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
              Médicaments
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Gérez votre inventaire de médicaments
            </p>
          </div>
          <button
            onClick={() => {
              setEditingMedication(null)
              setFormData({
                name: '',
                category: '',
                barcode: '',
                quantity: 0,
                productionDate: '',
                expirationDate: '',
                dosage: '',
                form: '',
                manufacturer: '',
                price: 0,
              })
              setShowModal(true)
            }}
            className="px-6 py-3.5 bg-[#0b8fac] text-white rounded-xl hover:bg-[#0a7085] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-[#0b8fac] hover:border-[#0a7085]"
          >
            Ajouter un medicament
          </button>
        </div>

        {/* Section recherche et filtre */}
        <div className="bg-gradient-to-r from-gray-50 to-beige-light rounded-xl p-4 sm:p-6 border border-gray-200 opacity-90">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="px-4 py-2.5 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
              <span className="text-sm font-semibold text-gray-700">filtrer</span>
            </div>
            <div className="w-full sm:w-80">
              <input
                type="text"
                placeholder="Rechercher un médicament..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Titre de la liste */}
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
          Liste des médicaments
        </h2>
      </div>

      {loading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  nom
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                  catégorie
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                  code barre
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  quantité
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                  date d'expiration
                </th>
                <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMedications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Aucun médicament trouvé
                  </td>
                </tr>
              ) : (
                filteredMedications.map((medication) => (
                  <tr key={medication.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {medication.name}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                      {medication.category || '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {medication.barcode || '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {medication.quantity || 0}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      {medication.expiration_date
                        ? new Date(medication.expiration_date).toLocaleDateString('fr-FR')
                        : '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(medication)}
                          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl border-2 border-blue-600 hover:border-blue-700"
                          title="Modifier"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteClick(medication)}
                          className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl border-2 border-red-600 hover:border-red-700"
                          title="Supprimer"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal d'ajout/modification */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full mx-4 relative shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-100 animate-slide-up">
            {/* En-tête avec titre */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-100">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {editingMedication ? 'Modifier médicament' : 'Ajouter un médicament'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingMedication(null)
                }}
                className="p-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-red-200 hover:border-red-300"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nom du médicament */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Nom du médicament
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Paracétamol 500mg"
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Catégorie
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Analgésique, Antibiotique..."
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Code barre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Code barre
                </label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleChange}
                  required
                  placeholder="Ex: 1234567890123"
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Quantité */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Quantité
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="0"
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Date de production */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Date de production
                </label>
                <input
                  type="date"
                  name="productionDate"
                  value={formData.productionDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Date d'expiration */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Date d'expiration
                </label>
                <input
                  type="date"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Dosage
                </label>
                <input
                  type="text"
                  name="dosage"
                  value={formData.dosage}
                  onChange={handleChange}
                  required
                  placeholder="Ex: 500mg, 10ml..."
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Forme */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Forme
                </label>
                <input
                  type="text"
                  name="form"
                  value={formData.form}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Comprimé, Gélule, Sirop..."
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Fabricant */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Fabricant
                </label>
                <input
                  type="text"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Laboratoire X..."
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3 pt-4 border-t-2 border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingMedication(null)
                  }}
                  className="flex-1 px-6 py-3.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-gray-300 hover:border-gray-400"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3.5 bg-[#0b8fac] text-white rounded-xl font-semibold hover:bg-[#0a7085] transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-[#0b8fac] hover:border-[#0a7085] transform hover:scale-105"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && medicationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 max-w-md w-full mx-4 relative shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Confirmer la suppression
            </h2>
            
            <p className="text-gray-600 text-center mb-2">
              Êtes-vous sûr de vouloir supprimer ce médicament ?
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-700 mb-1">Médicament :</p>
              <p className="text-lg font-semibold text-gray-900">{medicationToDelete.name}</p>
              {medicationToDelete.category && (
                <p className="text-sm text-gray-500 mt-1">Catégorie : {medicationToDelete.category}</p>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition shadow-md hover:shadow-lg"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition shadow-md hover:shadow-lg"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
