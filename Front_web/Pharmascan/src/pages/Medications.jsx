import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  normalizeBarcodeDigits,
  isValidBarcodeEntry,
  shouldWarnGtinChecksum,
  findBarcodeConflict,
} from '../lib/barcodeValidation'
import { mergeCategorySuggestions } from '../lib/medicationCategories'
import {
  MEDICATION_FORM_GROUPS,
  mergeDosageSuggestions,
  mergeExtraFormLabels,
  matchStoredFormToOption,
  CUSTOM_FORM_VALUE,
} from '../lib/medicationDosageForm'
import {
  isoDateToMonthYearInput,
  monthYearToExpirationIso,
  monthYearToProductionIso,
  formatExpirationMonthYear,
  expirationDateSortKey,
} from '../lib/medicationDates'
import {
  Plus,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

const LOW_STOCK_THRESHOLD = 10

function isLowStock(medication) {
  return (Number(medication?.quantity) || 0) < LOW_STOCK_THRESHOLD
}

const emptyMedicationFilters = () => ({
  name: '',
  category: '',
  manufacturer: '',
  form: '',
})

/** Filtres cumulatifs (ET) : champs vides = ignorés. */
function medicationMatchesFilters(med, f) {
  if (!med) return false
  const norm = (v) => (v == null ? '' : String(v)).trim().toLowerCase()

  if (f.name.trim() && !norm(med.name).includes(f.name.trim().toLowerCase())) return false
  if (f.category.trim() && !norm(med.category).includes(f.category.trim().toLowerCase())) return false
  if (f.manufacturer.trim() && !norm(med.manufacturer).includes(f.manufacturer.trim().toLowerCase()))
    return false
  if (f.form.trim() && !norm(med.form).includes(f.form.trim().toLowerCase())) return false
  return true
}

/** Aide repliable sous un champ (affichée seulement si l’utilisateur l’ouvre). */
function FieldHelp({ children, summary = 'Aide' }) {
  return (
    <details className="mt-1.5 text-xs text-gray-600">
      <summary className="cursor-pointer select-none text-[#0b8fac] font-medium hover:underline list-none [&::-webkit-details-marker]:hidden">
        {summary}
      </summary>
      <div className="mt-2 text-gray-500 border-l-2 border-gray-200 pl-3">{children}</div>
    </details>
  )
}

export default function Medications() {
  const { user } = useAuth()
  const [medications, setMedications] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingMedication, setEditingMedication] = useState(null)
  const [filters, setFilters] = useState(emptyMedicationFilters)
  const [sortBy, setSortBy] = useState('name')
  const [sortAsc, setSortAsc] = useState(true)
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
    price: 0,
  })

  useEffect(() => {
    if (user?.id) {
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

  const categorySuggestions = useMemo(
    () => mergeCategorySuggestions(medications),
    [medications]
  )

  const dosageSuggestions = useMemo(
    () => mergeDosageSuggestions(medications),
    [medications]
  )

  const extraFormLabels = useMemo(
    () => mergeExtraFormLabels(medications),
    [medications]
  )

  const filterDistinctOptions = useMemo(() => {
    const list = medications || []
    const cat = new Set()
    const man = new Set()
    const frm = new Set()
    list.forEach((m) => {
      if (m?.category?.trim()) cat.add(m.category.trim())
      if (m?.manufacturer?.trim()) man.add(m.manufacturer.trim())
      if (m?.form?.trim()) frm.add(m.form.trim())
    })
    return {
      categories: [...cat].sort((a, b) => a.localeCompare(b, 'fr')),
      manufacturers: [...man].sort((a, b) => a.localeCompare(b, 'fr')),
      forms: [...frm].sort((a, b) => a.localeCompare(b, 'fr')),
    }
  }, [medications])

  const filteredMedications = useMemo(() => {
    const list = medications || []
    return list.filter((med) => medicationMatchesFilters(med, filters))
  }, [medications, filters])

  const displayedMedications = useMemo(() => {
    const rows = [...filteredMedications]
    rows.sort((a, b) => {
      if (sortBy === 'name') {
        const an = (a.name || '').toLowerCase()
        const bn = (b.name || '').toLowerCase()
        const c = an.localeCompare(bn, 'fr')
        return sortAsc ? c : -c
      }
      if (sortBy === 'quantity') {
        const qa = Number(a.quantity) || 0
        const qb = Number(b.quantity) || 0
        return sortAsc ? qa - qb : qb - qa
      }
      if (sortBy === 'expiration') {
        const ta = expirationDateSortKey(a.expiration_date)
        const tb = expirationDateSortKey(b.expiration_date)
        return sortAsc ? ta - tb : tb - ta
      }
      return 0
    })
    return rows
  }, [filteredMedications, sortBy, sortAsc])

  const scrollToMedicationsTable = () => {
    document.getElementById('medications-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const resetFilters = () => setFilters(emptyMedicationFilters())

  const toggleSort = (key) => {
    if (sortBy === key) setSortAsc((s) => !s)
    else {
      setSortBy(key)
      setSortAsc(true)
    }
  }

  const handleFilterChange = (field) => (e) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'barcode') {
      const digits = value.replace(/\D/g, '').slice(0, 14)
      setFormData((prev) => ({ ...prev, barcode: digits }))
      return
    }
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'quantity' ? parseInt(value, 10) || 0 : name === 'price' ? parseFloat(value) || 0 : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (!formData.form.trim()) {
        alert('Veuillez indiquer la forme galénique (liste ou saisie « Autre »).')
        return
      }

      const barcodeNorm = normalizeBarcodeDigits(formData.barcode)
      if (!barcodeNorm) {
        alert('Veuillez saisir un code-barres (4 à 14 chiffres).')
        return
      }
      if (!isValidBarcodeEntry(formData.barcode)) {
        alert('Code-barres invalide : entrez 4 à 14 chiffres.')
        return
      }

      const conflict = findBarcodeConflict(
        medications,
        formData.barcode,
        {
          name: formData.name,
          manufacturer: formData.manufacturer,
          category: formData.category,
        },
        editingMedication?.id ?? null
      )
      if (conflict) {
        alert(
          `Ce code-barres est déjà utilisé par un autre produit (« ${conflict.name || 'sans nom'} »). Un même code ne peut pas désigner deux médicaments différents.`
        )
        return
      }

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
        category: formData.category.trim(),
        barcode: barcodeNorm,
        quantity: formData.quantity,
        production_date: monthYearToProductionIso(formData.productionDate) || null,
        expiration_date: monthYearToExpirationIso(formData.expirationDate) || null,
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
        price: 0,
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
      productionDate: isoDateToMonthYearInput(medication.production_date),
      expirationDate: isoDateToMonthYearInput(medication.expiration_date),
      dosage: medication.dosage || '',
      form: medication.form || '',
      manufacturer: medication.manufacturer || '',
      price: medication.price != null ? Number(medication.price) : 0,
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
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicationToDelete.id)

      if (error) throw error
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen w-full">
      {/* En-tête */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Médicaments
            </h1>
            <p className="mt-1 text-gray-600 text-sm sm:text-base">
              Gérez votre inventaire de médicaments
            </p>
          </div>
          <button
            type="button"
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
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-[#0b8fac] bg-[#0b8fac] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#0a7085]"
          >
            <Plus className="h-5 w-5" aria-hidden />
            Ajouter un médicament
          </button>
        </div>

        {/* Barre de filtres (style tableau de bord) */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            scrollToMedicationsTable()
          }}
          className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-md sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-800">Filtrer la liste</span>
            <span className="text-xs text-gray-500">
              {filteredMedications.length} résultat{filteredMedications.length > 1 ? 's' : ''}
              {(medications || []).length !== filteredMedications.length
                ? ` sur ${(medications || []).length}`
                : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="filter-name">
                Nom du médicament
              </label>
              <input
                id="filter-name"
                type="text"
                value={filters.name}
                onChange={handleFilterChange('name')}
                autoComplete="off"
                placeholder="Ex. Paracétamol"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0b8fac] focus:outline-none focus:ring-1 focus:ring-[#0b8fac]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="filter-category">
                Catégorie
              </label>
              <input
                id="filter-category"
                type="text"
                value={filters.category}
                onChange={handleFilterChange('category')}
                list="medication-filter-categories"
                autoComplete="off"
                placeholder="Toutes"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0b8fac] focus:outline-none focus:ring-1 focus:ring-[#0b8fac]"
              />
              <datalist id="medication-filter-categories">
                {filterDistinctOptions.categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="filter-manufacturer">
                Fabricant
              </label>
              <input
                id="filter-manufacturer"
                type="text"
                value={filters.manufacturer}
                onChange={handleFilterChange('manufacturer')}
                list="medication-filter-manufacturers"
                autoComplete="off"
                placeholder="Tous"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0b8fac] focus:outline-none focus:ring-1 focus:ring-[#0b8fac]"
              />
              <datalist id="medication-filter-manufacturers">
                {filterDistinctOptions.manufacturers.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600" htmlFor="filter-form">
                Forme galénique
              </label>
              <input
                id="filter-form"
                type="text"
                value={filters.form}
                onChange={handleFilterChange('form')}
                list="medication-filter-forms"
                autoComplete="off"
                placeholder="Toutes"
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0b8fac] focus:outline-none focus:ring-1 focus:ring-[#0b8fac]"
              />
              <datalist id="medication-filter-forms">
                {filterDistinctOptions.forms.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Réinitialiser
            </button>
            <button
              type="submit"
              className="rounded-lg border-2 border-[#0b8fac] bg-[#0b8fac] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#0a7085]"
            >
              Filtrer
            </button>
          </div>
        </form>
      </div>

      {/* Liste */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
          Liste des médicaments
        </h2>
      </div>

      {loading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div
          id="medications-table"
          className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-md"
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th scope="col" className="px-3 py-3 text-left sm:px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('name')}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700 hover:text-[#0b8fac]"
                  >
                    Nom
                    {sortBy === 'name' ? (
                      sortAsc ? (
                        <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                    )}
                  </button>
                  <span className="ml-1 text-xs font-normal normal-case text-gray-500">
                    ({displayedMedications.length})
                  </span>
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700 sm:table-cell sm:px-4"
                >
                  Dosage
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700 md:table-cell md:px-4"
                >
                  Forme
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700 sm:table-cell sm:px-4"
                >
                  Catégorie
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700 lg:table-cell lg:px-4"
                >
                  Fabricant
                </th>
                <th
                  scope="col"
                  className="hidden px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-700 md:table-cell md:px-4"
                >
                  Code-barres
                </th>
                <th scope="col" className="px-3 py-3 text-left sm:px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('quantity')}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700 hover:text-[#0b8fac]"
                  >
                    Qté
                    {sortBy === 'quantity' ? (
                      sortAsc ? (
                        <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                    )}
                  </button>
                </th>
                <th scope="col" className="hidden px-3 py-3 text-left lg:table-cell lg:px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('expiration')}
                    className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-700 hover:text-[#0b8fac]"
                  >
                    Expiration
                    {sortBy === 'expiration' ? (
                      sortAsc ? (
                        <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-700 sm:px-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayedMedications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                    Aucun médicament ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                displayedMedications.map((medication, index) => {
                  const low = isLowStock(medication)
                  const zebra = !low && index % 2 === 1 ? 'bg-gray-50/80' : !low ? 'bg-white' : ''
                  return (
                    <tr
                      key={medication.id}
                      className={`${zebra} ${
                        low
                          ? 'border-l-4 border-l-red-500 bg-red-50 hover:bg-red-100/90'
                          : 'hover:bg-gray-100/70'
                      } transition-colors`}
                    >
                      <td
                        className={`whitespace-nowrap px-3 py-3 text-sm font-medium sm:px-4 ${
                          low ? 'text-red-900' : 'text-gray-900'
                        }`}
                      >
                        {medication.name}
                      </td>
                      <td
                        className={`hidden whitespace-nowrap px-3 py-3 text-sm sm:table-cell sm:px-4 ${
                          low ? 'text-red-800/90' : 'text-gray-600'
                        }`}
                      >
                        {medication.dosage || '—'}
                      </td>
                      <td
                        className={`hidden whitespace-nowrap px-3 py-3 text-sm md:table-cell md:px-4 ${
                          low ? 'text-red-800/90' : 'text-gray-600'
                        }`}
                      >
                        {medication.form || '—'}
                      </td>
                      <td
                        className={`hidden whitespace-nowrap px-3 py-3 text-sm sm:table-cell sm:px-4 ${
                          low ? 'text-red-800/90' : 'text-gray-600'
                        }`}
                      >
                        {medication.category || '—'}
                      </td>
                      <td
                        className={`hidden max-w-[10rem] truncate whitespace-nowrap px-3 py-3 text-sm lg:table-cell lg:max-w-[12rem] lg:px-4 ${
                          low ? 'text-red-800/90' : 'text-gray-600'
                        }`}
                        title={medication.manufacturer || ''}
                      >
                        {medication.manufacturer || '—'}
                      </td>
                      <td
                        className={`hidden whitespace-nowrap px-3 py-3 font-mono text-sm tabular-nums md:table-cell md:px-4 ${
                          low ? 'text-red-800/90' : 'text-gray-600'
                        }`}
                      >
                        {medication.barcode || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm sm:px-4">
                        <span
                          className={
                            low
                              ? 'inline-flex min-w-[2rem] items-center justify-center rounded-md bg-red-100 px-2 py-0.5 font-bold tabular-nums text-red-700 ring-1 ring-red-200'
                              : 'tabular-nums text-gray-700'
                          }
                        >
                          {medication.quantity ?? 0}
                        </span>
                      </td>
                      <td
                        className={`hidden whitespace-nowrap px-3 py-3 text-sm lg:table-cell lg:px-4 ${
                          low ? 'text-red-800/90' : 'text-gray-600'
                        }`}
                      >
                        {medication.expiration_date
                          ? formatExpirationMonthYear(medication.expiration_date)
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right text-sm sm:px-4">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(medication)}
                            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 sm:px-4 sm:py-2 sm:text-sm"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(medication)}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 sm:px-4 sm:py-2 sm:text-sm"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
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

              {/* Catégorie — liste + saisie libre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5" htmlFor="medication-category">
                  Catégorie
                </label>
                <input
                  id="medication-category"
                  type="text"
                  name="category"
                  list="medication-category-list"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  placeholder="Choisir ou saisir une catégorie"
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
                <datalist id="medication-category-list">
                  {categorySuggestions.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <FieldHelp>
                  Liste de référence et catégories déjà utilisées dans votre pharmacie. Vous pouvez saisir une nouvelle
                  catégorie.
                </FieldHelp>
              </div>

              {/* Code-barres GTIN */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5" htmlFor="medication-barcode">
                  Code-barres (GTIN)
                </label>
                <input
                  id="medication-barcode"
                  type="text"
                  name="barcode"
                  inputMode="numeric"
                  value={formData.barcode}
                  onChange={handleChange}
                  maxLength={14}
                  placeholder="EAN-8, EAN-13…"
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md font-mono tabular-nums"
                />
                <FieldHelp>
                  Chiffres uniquement (4 à 14). EAN/GTIN, codes CIP ou internes. Un même code ne peut pas servir à deux
                  produits différents.
                </FieldHelp>
                {shouldWarnGtinChecksum(formData.barcode) ? (
                  <p className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Le dernier chiffre ne correspond pas au calcul GS1 (EAN-8, UPC-12, EAN-13, GTIN-14). Vérifiez un
                    chiffre mal lu, un zéro en tête manquant, ou une copie avec des chiffres « spéciaux » (PDF) — la
                    normalisation est appliquée automatiquement. Les codes CIP ou internes peuvent être valides sans
                    cette clé ; vous pouvez enregistrer si le code correspond bien à votre emballage.
                  </p>
                ) : null}
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

              {/* Production mois / année */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Production (mois / année)
                </label>
                <input
                  type="month"
                  name="productionDate"
                  value={formData.productionDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
                <FieldHelp>
                  Enregistré au 1er jour du mois choisi (lot fabriqué durant ce mois).
                </FieldHelp>
              </div>

              {/* Expiration mois / année */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Expiration (mois / année)
                </label>
                <input
                  type="month"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
                <FieldHelp>
                  Enregistré comme valable jusqu’à la fin du mois choisi (usage courant en officine).
                </FieldHelp>
              </div>

              {/* Dosage (concentration / dose — unités variées) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5" htmlFor="medication-dosage">
                  Dosage (concentration ou dose)
                </label>
                <input
                  id="medication-dosage"
                  type="text"
                  name="dosage"
                  list="medication-dosage-suggestions"
                  value={formData.dosage}
                  onChange={handleChange}
                  required
                  autoComplete="off"
                  placeholder="Ex. 500 mg, 1000 mg, 10 ml, 5 mg/ml, 1000 UI…"
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
                <datalist id="medication-dosage-suggestions">
                  {dosageSuggestions.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
                <FieldHelp>
                  Unités courantes : mg, g, µg, UI, ml, mg/ml, µg/ml, %. Saisie libre pour les dosages composés ou
                  particuliers (ex. 2,5 mg + 0,025 mg).
                </FieldHelp>
              </div>

              {/* Forme galénique (catégories) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2.5" htmlFor="medication-form-select">
                  Forme galénique
                </label>
                <select
                  id="medication-form-select"
                  value={matchStoredFormToOption(formData.form, extraFormLabels)}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === CUSTOM_FORM_VALUE) {
                      setFormData((prev) => ({ ...prev, form: '' }))
                    } else {
                      setFormData((prev) => ({ ...prev, form: v }))
                    }
                  }}
                  required
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                >
                  <option value="">— Choisir une forme —</option>
                  {MEDICATION_FORM_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {extraFormLabels.length > 0 ? (
                    <optgroup label="Déjà utilisées dans votre inventaire">
                      {extraFormLabels.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  <option value={CUSTOM_FORM_VALUE}>Autre (préciser ci-dessous)</option>
                </select>
                {matchStoredFormToOption(formData.form, extraFormLabels) === CUSTOM_FORM_VALUE ? (
                  <input
                    type="text"
                    name="form"
                    value={formData.form}
                    onChange={handleChange}
                    required
                    placeholder="Précisez la forme (ex. sachet, spray buccal…)"
                    className="mt-2 w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                  />
                ) : null}
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
