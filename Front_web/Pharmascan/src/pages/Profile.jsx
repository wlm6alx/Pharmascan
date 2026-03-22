import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, isDemoMode } from '../lib/supabase'
import { mockPharmacy, mockStorage } from '../lib/mockData'
import { X, Edit, Save, Building2, User, Phone, MapPin, FileText, Mail, Upload, Camera, Image, Eye, EyeOff, Lock } from 'lucide-react'
import { getFormattedCountries, getAllCitiesByCountry } from '../lib/locationData'
import { getPhoneCode, getPhoneCodesList } from '../lib/phoneCodes'

export default function Profile() {
  const { user } = useAuth()
  const [pharmacy, setPharmacy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    pharmacyName: '',
    ownerName: '',
    licenseNumber: '',
    country: 'CM',
    phoneCode: '+237',
    phoneNumber: '',
    city: '',
    street: '',
    reference: '',
    attestationFile: null,
    photoFile: null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [attestationUrl, setAttestationUrl] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })
  const [phoneCodesList] = useState(() => getPhoneCodesList())
  const [availableCities, setAvailableCities] = useState([])
  const [countries] = useState(() => getFormattedCountries())

  useEffect(() => {
    fetchPharmacy()
  }, [user])

  useEffect(() => {
    if (formData.country) {
      try {
        const cities = getAllCitiesByCountry(formData.country)
        // Convertir les objets { name: string } en strings si nécessaire
        const cityNames = cities.map(city => typeof city === 'string' ? city : city.name)
        setAvailableCities(cityNames)
      } catch (error) {
        console.error('Erreur lors du chargement des villes:', error)
        setAvailableCities([])
      }
    }
  }, [formData.country])

  const fetchPharmacy = async () => {
    try {
      if (isDemoMode) {
        const pharm = mockStorage.pharmacy || mockPharmacy
        setPharmacy(pharm)
        const addressParts = pharm.address?.split('-') || []
        setFormData({
          email: user?.email || '',
          pharmacyName: pharm.name || '',
          ownerName: '',
          licenseNumber: '',
          country: 'CM',
          phoneCode: '+237',
          phoneNumber: pharm.phone?.replace('+237 ', '') || '',
          city: addressParts[0] || '',
          street: addressParts[1] || '',
          reference: addressParts[2] || '',
          attestationFile: null,
          photoFile: null,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
        setAttestationUrl(pharm.attestation_url || null)
        setPhotoUrl(pharm.photo_url || null)
      } else {
        const { data: pharmacist } = await supabase
          .from('pharmacists')
          .select('*, pharmacies(*)')
          .eq('user_id', user.id)
          .single()

        if (pharmacist?.pharmacies) {
          const pharm = pharmacist.pharmacies
          setPharmacy(pharm)
          const addressParts = pharm.address?.split('-') || []
          setFormData({
            email: user?.email || '',
            pharmacyName: pharm.name || '',
            ownerName: pharm.owner_name || '',
            licenseNumber: pharm.license_number || '',
            country: pharm.country || 'CM',
            phoneCode: pharm.phone_code || '+237',
            phoneNumber: pharm.phone?.replace(pharm.phone_code || '+237', '').trim() || '',
            city: addressParts[0] || '',
            street: addressParts[1] || '',
            reference: addressParts[2] || '',
            attestationFile: null,
            photoFile: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          })
          setAttestationUrl(pharm.attestation_url || null)
          setPhotoUrl(pharm.photo_url || null)
        }
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'country') {
      // Mettre à jour le code téléphonique quand le pays change
      try {
        const phoneData = getPhoneCode(value)
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          phoneCode: phoneData?.code || '+237',
          city: '', // Réinitialiser la ville quand le pays change
        }))
      } catch (error) {
        console.error('Erreur lors de la mise à jour du code téléphonique:', error)
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          city: '',
        }))
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const buildAddress = () => {
    const parts = []
    if (formData.city) parts.push(formData.city)
    if (formData.street) parts.push(formData.street)
    if (formData.reference) parts.push(formData.reference)
    return parts.join(' - ')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Vérifier si un nouveau mot de passe est fourni
      if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
        if (!formData.currentPassword) {
          alert('Veuillez entrer votre mot de passe actuel')
          return
        }
        if (!formData.newPassword) {
          alert('Veuillez entrer un nouveau mot de passe')
          return
        }
        if (formData.newPassword !== formData.confirmPassword) {
          alert('Les nouveaux mots de passe ne correspondent pas')
          return
        }
        if (!passwordStrength.length || !passwordStrength.uppercase || !passwordStrength.lowercase || !passwordStrength.number || !passwordStrength.special) {
          alert('Le nouveau mot de passe doit être fort (min 8 caractères, majuscule, minuscule, chiffre, caractère spécial)')
          return
        }

        // Changer le mot de passe
        if (!isDemoMode) {
          const { error: updateError } = await supabase.auth.updateUser({
            password: formData.newPassword
          })
          if (updateError) throw updateError
        }
      }

      let attestationUrlToSave = attestationUrl
      let photoUrlToSave = photoUrl

      // Upload des fichiers si présents
      if (formData.attestationFile) {
        if (isDemoMode) {
          attestationUrlToSave = URL.createObjectURL(formData.attestationFile)
        } else {
          const { data: attestationData, error: attestationError } = await supabase.storage
            .from('pharmacy-documents')
            .upload(`${user.id}/attestation-${Date.now()}`, formData.attestationFile)
          
          if (!attestationError) {
            const { data: { publicUrl } } = supabase.storage
              .from('pharmacy-documents')
              .getPublicUrl(attestationData.path)
            attestationUrlToSave = publicUrl
          }
        }
      }

      if (formData.photoFile) {
        if (isDemoMode) {
          photoUrlToSave = URL.createObjectURL(formData.photoFile)
        } else {
          const { data: photoData, error: photoError } = await supabase.storage
            .from('pharmacy-photos')
            .upload(`${user.id}/photo-${Date.now()}`, formData.photoFile)
          
          if (!photoError) {
            const { data: { publicUrl } } = supabase.storage
              .from('pharmacy-photos')
              .getPublicUrl(photoData.path)
            photoUrlToSave = publicUrl
          }
        }
      }

      if (isDemoMode) {
        const address = buildAddress()
        mockStorage.pharmacy = {
          ...mockStorage.pharmacy,
          name: formData.pharmacyName,
          address: address,
          phone: `${formData.phoneCode} ${formData.phoneNumber}`,
          owner_name: formData.ownerName,
          license_number: formData.licenseNumber,
          country: formData.country,
          phone_code: formData.phoneCode,
          attestation_url: attestationUrlToSave,
          photo_url: photoUrlToSave,
        }
      } else {
        const address = buildAddress()
        const updateData = {
          name: formData.pharmacyName,
          address: address,
          phone: `${formData.phoneCode} ${formData.phoneNumber}`,
          owner_name: formData.ownerName,
          license_number: formData.licenseNumber,
          country: formData.country,
          phone_code: formData.phoneCode,
        }
        
        if (attestationUrlToSave) updateData.attestation_url = attestationUrlToSave
        if (photoUrlToSave) updateData.photo_url = photoUrlToSave

        const { error } = await supabase
          .from('pharmacies')
          .update(updateData)
          .eq('id', pharmacy.id)

        if (error) throw error
      }

      // Réinitialiser les champs de mot de passe
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))

      await fetchPharmacy()
      setShowModal(false)
      alert('Profil mis à jour avec succès')
    } catch (error) {
      alert('Erreur lors de la mise à jour: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#0b8fac]"></div>
        <p className="mt-4 text-gray-600">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen w-full flex flex-col items-center">
      {/* En-tête */}
      <div className="mb-8 text-center w-full">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
          Profil
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Gérez les informations de votre pharmacie
        </p>
      </div>

      {/* Carte principale */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 lg:p-10 max-w-4xl w-full shadow-lg border-2 border-gray-100">
        {/* Photo de la pharmacie */}
        <div className="flex justify-center mb-8">
          {photoUrl ? (
            <div className="relative">
              <img 
                src={photoUrl} 
                alt="Photo de la pharmacie" 
                className="w-32 h-32 rounded-full object-cover border-4 border-[#0b8fac] shadow-xl"
              />
              <div className="absolute -bottom-2 -right-2 bg-[#0b8fac] rounded-full p-2 shadow-lg">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
          ) : (
            <div className="w-32 h-32 bg-gradient-to-br from-[#0b8fac] to-[#7bc1b7] rounded-full flex items-center justify-center shadow-xl">
              <Building2 className="w-16 h-16 text-white" />
            </div>
          )}
        </div>

        {/* Informations en lecture seule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 text-[#0b8fac]" />
              <label className="text-sm font-semibold text-gray-700">Nom de la pharmacie</label>
            </div>
            <p className="text-gray-900 font-medium">{pharmacy?.name || formData.pharmacyName || '-'}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-5 w-5 text-[#0b8fac]" />
              <label className="text-sm font-semibold text-gray-700">Email</label>
            </div>
            <p className="text-gray-900 font-medium">{formData.email || user?.email || '-'}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <User className="h-5 w-5 text-[#0b8fac]" />
              <label className="text-sm font-semibold text-gray-700">Propriétaire / Représentant légal</label>
            </div>
            <p className="text-gray-900 font-medium">{formData.ownerName || '-'}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-5 w-5 text-[#0b8fac]" />
              <label className="text-sm font-semibold text-gray-700">Numéro d'agrément / Licence</label>
            </div>
            <p className="text-gray-900 font-medium">{formData.licenseNumber || '-'}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Phone className="h-5 w-5 text-[#0b8fac]" />
              <label className="text-sm font-semibold text-gray-700">Téléphone</label>
            </div>
            <p className="text-gray-900 font-medium">
              {formData.phoneCode && formData.phoneNumber 
                ? `${formData.phoneCode} ${formData.phoneNumber}` 
                : pharmacy?.phone || '-'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-5 w-5 text-[#0b8fac]" />
              <label className="text-sm font-semibold text-gray-700">Adresse</label>
            </div>
            <p className="text-gray-900 font-medium">
              {[formData.city, formData.street, formData.reference].filter(Boolean).join(' - ') || pharmacy?.address || '-'}
            </p>
          </div>
        </div>

        {/* Bouton Modifier */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-3 px-8 py-4 bg-[#0b8fac] text-white rounded-xl hover:bg-[#0a7085] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-[#0b8fac] hover:border-[#0a7085]"
          >
            <Edit className="h-5 w-5" />
            <span>Modifier le profil</span>
          </button>
        </div>
      </div>

      {/* Modal d'édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-3xl w-full mx-4 relative shadow-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-100 animate-slide-up">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-gray-100">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Modifier le profil
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-red-200 hover:border-red-300"
                title="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
              {/* Email (lecture seule) */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || user?.email || ''}
                  readOnly
                  className="w-full px-4 py-3.5 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-600 cursor-not-allowed"
                />
              </div>

              {/* Nom de la pharmacie */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Nom de la pharmacie
                </label>
                <input
                  type="text"
                  name="pharmacyName"
                  value={formData.pharmacyName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Propriétaire */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Nom du propriétaire / Représentant légal
                </label>
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Numéro d'agrément */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Numéro d'agrément / Licence de la pharmacie
                </label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Pays */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Pays
                </label>
                <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Téléphone */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Téléphone
                </label>
                <div className="flex gap-3">
                  <select
                    name="phoneCode"
                    value={formData.phoneCode}
                    onChange={handleChange}
                    className="w-32 px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm"
                  >
                    {phoneCodesList.map((code) => (
                      <option key={code.code} value={code.code}>
                        {code.flag} {code.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    placeholder="Numéro de téléphone"
                    className="flex-1 px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                  />
                </div>
              </div>

              {/* Ville */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Ville
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                >
                  <option value="">Sélectionner une ville</option>
                  {availableCities.map((cityObj) => {
                    const cityName = typeof cityObj === 'string' ? cityObj : cityObj.name
                    return (
                      <option key={cityName} value={cityName}>
                        {cityName}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Rue / Avenue / Quartier */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Rue / Avenue / Quartier
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Référence / Point de repère */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Référence / Point de repère
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Photo de la pharmacie */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Photo de la pharmacie
                </label>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={formData.photoFile ? formData.photoFile.name : (photoUrl ? 'Photo actuelle' : '')}
                    placeholder="Aucune photo sélectionnée"
                    className="flex-1 px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl"
                  />
                  <label className="px-6 py-3.5 bg-[#0b8fac] text-white rounded-xl cursor-pointer hover:bg-[#0a7085] transition-all duration-200 shadow-md hover:shadow-lg border-2 border-[#0b8fac] hover:border-[#0a7085] flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    <span>Importer</span>
                    <input
                      type="file"
                      name="photoFile"
                      onChange={handleChange}
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                </div>
                {photoUrl && (
                  <div className="mt-3">
                    <img 
                      src={photoUrl} 
                      alt="Aperçu" 
                      className="w-full h-48 object-cover rounded-lg border-2 border-gray-300"
                    />
                  </div>
                )}
              </div>

              {/* Attestation de la pharmacie */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Attestation de la pharmacie
                </label>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={formData.attestationFile ? formData.attestationFile.name : (attestationUrl ? 'Attestation actuelle' : '')}
                    placeholder="Aucune attestation sélectionnée"
                    className="flex-1 px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl"
                  />
                  <label className="px-6 py-3.5 bg-[#0b8fac] text-white rounded-xl cursor-pointer hover:bg-[#0a7085] transition-all duration-200 shadow-md hover:shadow-lg border-2 border-[#0b8fac] hover:border-[#0a7085] flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    <span>Importer</span>
                    <input
                      type="file"
                      name="attestationFile"
                      onChange={handleChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                </div>
                {attestationUrl && !formData.attestationFile && (
                  <div className="mt-3">
                    <a 
                      href={attestationUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      <FileText className="h-5 w-5" />
                      <span>Voir l'attestation actuelle</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Section changement de mot de passe */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <Lock className="h-5 w-5 text-[#0b8fac]" />
                  <h3 className="text-lg font-bold text-gray-900">Changer le mot de passe</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Mot de passe actuel */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                      Mot de passe actuel
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        placeholder="Entrez votre mot de passe actuel"
                        className="w-full px-4 py-3.5 pr-12 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Nouveau mot de passe */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        placeholder="Entrez un nouveau mot de passe"
                        className={`w-full px-4 py-3.5 pr-12 bg-white border-2 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md ${
                          formData.newPassword && (!passwordStrength.length || !passwordStrength.uppercase || !passwordStrength.lowercase || !passwordStrength.number || !passwordStrength.special)
                            ? 'border-red-300'
                            : formData.newPassword && passwordStrength.length && passwordStrength.uppercase && passwordStrength.lowercase && passwordStrength.number && passwordStrength.special
                            ? 'border-green-500'
                            : 'border-gray-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {formData.newPassword && (
                      <div className="mt-2 space-y-1">
                        <div className={`flex items-center gap-2 text-xs ${passwordStrength.length ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.length ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                          <span>Au moins 8 caractères</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.uppercase ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                          <span>Une majuscule</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.lowercase ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                          <span>Une minuscule</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordStrength.number ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.number ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                          <span>Un chiffre</span>
                        </div>
                        <div className={`flex items-center gap-2 text-xs ${passwordStrength.special ? 'text-green-600' : 'text-gray-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${passwordStrength.special ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                          <span>Un caractère spécial</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirmer le mot de passe */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                      Confirmer le nouveau mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirmez le nouveau mot de passe"
                        className={`w-full px-4 py-3.5 pr-12 bg-white border-2 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md ${
                          formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                            ? 'border-red-300'
                            : formData.confirmPassword && formData.newPassword === formData.confirmPassword
                            ? 'border-green-500'
                            : 'border-gray-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                      <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                    )}
                    {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                      <p className="mt-1 text-xs text-green-600">Les mots de passe correspondent</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-4 pt-6 border-t-2 border-gray-100 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-gray-300 hover:border-gray-400"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0b8fac] text-white rounded-xl font-semibold hover:bg-[#0a7085] transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-[#0b8fac] hover:border-[#0a7085] transform hover:scale-105"
                >
                  <Save className="h-5 w-5" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
