import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, AlertCircle, Upload } from 'lucide-react'
import PharmaScanLogo from '../components/PharmaScanLogo'
import { 
  getFormattedCountries,
  getAllCitiesByCountry,
  getCountryName
} from '../lib/locationData'
import { getPhoneCode } from '../lib/phoneCodes'

export default function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    pharmacyName: '',
    ownerName: '',
    licenseNumber: '',
    country: 'CM', // Cameroun par défaut
    phoneCode: '+237', // Code téléphonique par défaut (Cameroun)
    phoneNumber: '',
    city: '',
    street: '',
    reference: '',
    acceptTerms: false,
    acceptPrivacy: false,
    attestationFile: null,
    photoFile: null,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })
  const [availableCities, setAvailableCities] = useState([])
  const [countries] = useState(() => getFormattedCountries())
  const navigate = useNavigate()

  // Mettre à jour les villes et le code téléphonique quand le pays change
  useEffect(() => {
    if (formData.country) {
      const cities = getAllCitiesByCountry(formData.country)
      setAvailableCities(cities)
      // Mettre à jour le code téléphonique selon le pays
      const phoneData = getPhoneCode(formData.country)
      setFormData(prev => ({ 
        ...prev, 
        city: '',
        phoneCode: phoneData.code
      }))
    } else {
      setAvailableCities([])
    }
  }, [formData.country])

  // Vérifier la force du mot de passe en temps réel
  useEffect(() => {
    const password = formData.password
    setPasswordStrength({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    })
  }, [formData.password])

  const handleChange = (e) => {
    const { name, value, type, files, checked } = e.target
    if (type === 'file') {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0] || null,
      }))
      // Réinitialiser l'erreur du champ quand un fichier est sélectionné
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    } else {
      // Si le pays change, réinitialiser les champs géographiques et mettre à jour le code téléphonique
      if (name === 'country') {
        const phoneData = getPhoneCode(value)
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          phoneCode: phoneData.code,
          city: '',
          street: '',
          reference: '',
        }))
      } else if (type === 'checkbox') {
        setFormData((prev) => ({
          ...prev,
          [name]: checked,
        }))
        // Réinitialiser l'erreur du champ quand la checkbox est cochée
        if (fieldErrors[name]) {
          setFieldErrors((prev) => {
            const newErrors = { ...prev }
            delete newErrors[name]
            return newErrors
          })
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }))
      }
      // Réinitialiser l'erreur du champ quand l'utilisateur commence à taper
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[name]
          return newErrors
        })
      }
    }
  }

  // Construire l'adresse complète
  const buildAddress = () => {
    const parts = []
    
    // Ajouter la ville
    if (formData.city) parts.push(formData.city)
    
    // Ajouter le pays
    if (formData.country) {
      const countryName = getCountryName(formData.country)
      if (countryName) parts.push(countryName)
    }
    
    // Ajouter la rue et la référence
    if (formData.street) parts.push(formData.street)
    if (formData.reference) parts.push(`Réf: ${formData.reference}`)
    
    // Si aucune partie n'est remplie, retourner une chaîne vide
    return parts.length > 0 ? parts.join(' - ') : ''
  }


  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation complète de tous les champs
    const errors = []
    const newFieldErrors = {}

    if (!formData.email || formData.email.trim() === '') {
      errors.push('L\'email est obligatoire')
      newFieldErrors.email = 'L\'email est obligatoire'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('L\'email n\'est pas valide')
      newFieldErrors.email = 'L\'email n\'est pas valide'
    }

    if (!formData.password || formData.password.trim() === '') {
      errors.push('Le mot de passe est obligatoire')
      newFieldErrors.password = 'Le mot de passe est obligatoire'
    } else {
      // Validation du mot de passe fort
      const passwordErrors = []
      if (formData.password.length < 8) {
        passwordErrors.push('au moins 8 caractères')
      }
      if (!/[A-Z]/.test(formData.password)) {
        passwordErrors.push('une majuscule')
      }
      if (!/[a-z]/.test(formData.password)) {
        passwordErrors.push('une minuscule')
      }
      if (!/[0-9]/.test(formData.password)) {
        passwordErrors.push('un chiffre')
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
        passwordErrors.push('un caractère spécial')
      }
      
      if (passwordErrors.length > 0) {
        errors.push(`Le mot de passe doit contenir : ${passwordErrors.join(', ')}`)
        newFieldErrors.password = `Le mot de passe doit contenir : ${passwordErrors.join(', ')}`
      }
    }

    if (!formData.pharmacyName || formData.pharmacyName.trim() === '') {
      errors.push('Le nom de la pharmacie est obligatoire')
      newFieldErrors.pharmacyName = 'Le nom de la pharmacie est obligatoire'
    }

    if (!formData.confirmPassword || formData.confirmPassword.trim() === '') {
      errors.push('La confirmation du mot de passe est obligatoire')
      newFieldErrors.confirmPassword = 'La confirmation du mot de passe est obligatoire'
    } else if (formData.password !== formData.confirmPassword) {
      errors.push('Les mots de passe ne correspondent pas')
      newFieldErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    if (!formData.ownerName || formData.ownerName.trim() === '') {
      errors.push('Le nom du propriétaire / représentant légal est obligatoire')
      newFieldErrors.ownerName = 'Le nom du propriétaire / représentant légal est obligatoire'
    }

    if (!formData.licenseNumber || formData.licenseNumber.trim() === '') {
      errors.push('Le numéro d\'agrément / licence de la pharmacie est obligatoire')
      newFieldErrors.licenseNumber = 'Le numéro d\'agrément / licence de la pharmacie est obligatoire'
    }

    if (!formData.acceptTerms) {
      errors.push('Vous devez accepter les conditions générales d\'utilisation')
      newFieldErrors.acceptTerms = 'Vous devez accepter les conditions générales d\'utilisation'
    }

    if (!formData.acceptPrivacy) {
      errors.push('Vous devez accepter la politique de confidentialité')
      newFieldErrors.acceptPrivacy = 'Vous devez accepter la politique de confidentialité'
    }

    if (!formData.attestationFile) {
      errors.push('L\'attestation de la pharmacie est obligatoire')
      newFieldErrors.attestationFile = 'L\'attestation de la pharmacie est obligatoire'
    }

    if (!formData.photoFile) {
      errors.push('La photo de la pharmacie est obligatoire')
      newFieldErrors.photoFile = 'La photo de la pharmacie est obligatoire'
    }

    if (!formData.country) {
      errors.push('Le pays est obligatoire')
      newFieldErrors.country = 'Le pays est obligatoire'
    }

    if (!formData.city || formData.city.trim() === '') {
      errors.push('La ville est obligatoire')
      newFieldErrors.city = 'La ville est obligatoire'
    }

    // Afficher toutes les erreurs
    if (errors.length > 0) {
      setFieldErrors(newFieldErrors)
      // Afficher un popup simple
      alert('Veuillez remplir tous les champs obligatoires.')
      setLoading(false)
      return
    }

    // Réinitialiser les erreurs de champs si la validation passe
    setFieldErrors({})
    setError('')

    try {
        const fullAddress = buildAddress()

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              register_flow: 'pharmascan',
              pharmacy_name: formData.pharmacyName.trim(),
              address: fullAddress,
              owner_name: formData.ownerName.trim(),
              phone: `${formData.phoneCode} ${formData.phoneNumber}`.trim(),
              license_number: formData.licenseNumber.trim(),
              country: formData.country,
              phone_code: formData.phoneCode,
              city: formData.city.trim(),
              street: formData.street.trim(),
              address_reference: formData.reference.trim(),
            },
          },
        })

        if (authError) throw authError

        if (!authData.user) {
          throw new Error('Création du compte impossible. Réessayez ou utilisez un autre email.')
        }

        // Session immédiate (ex. confirmation d’email désactivée) : upload + mise à jour des URLs
        if (authData.session) {
          const { data: pharm, error: pharmErr } = await supabase
            .from('pharmacists')
            .select('id, pharmacy_id')
            .eq('user_id', authData.user.id)
            .single()

          if (pharmErr || !pharm?.pharmacy_id) {
            throw new Error(
              'Le profil pharmacien n’a pas été créé côté base. Exécutez le script supabase-auth-trigger.sql dans le SQL Editor Supabase, puis réessayez l’inscription.'
            )
          }

          let attestationUrl = null
          let photoUrl = null

          if (formData.attestationFile) {
            const { data: attestationData, error: attestationError } = await supabase.storage
              .from('pharmacy-documents')
              .upload(`${authData.user.id}/attestation-${Date.now()}`, formData.attestationFile)

            if (attestationError) {
              throw new Error(
                `Envoi de l’attestation refusé : ${attestationError.message}. Vérifiez supabase-storage.sql et les politiques Storage.`
              )
            }
            const { data: { publicUrl } } = supabase.storage
              .from('pharmacy-documents')
              .getPublicUrl(attestationData.path)
            attestationUrl = publicUrl
          }

          if (formData.photoFile) {
            const { data: photoData, error: photoError } = await supabase.storage
              .from('pharmacy-photos')
              .upload(`${authData.user.id}/photo-${Date.now()}`, formData.photoFile)

            if (photoError) {
              throw new Error(
                `Envoi de la photo refusé : ${photoError.message}. Vérifiez supabase-storage.sql et les politiques Storage.`
              )
            }
            const { data: { publicUrl } } = supabase.storage
              .from('pharmacy-photos')
              .getPublicUrl(photoData.path)
            photoUrl = publicUrl
          }

          const { error: upErr } = await supabase
            .from('pharmacies')
            .update({ attestation_url: attestationUrl, photo_url: photoUrl })
            .eq('id', pharm.pharmacy_id)

          if (upErr) throw upErr

          navigate('/login', { state: { registrationComplete: true } })
        } else {
          // Confirmation d’email : pas de session → pas d’upload (dépôt possible depuis Profil après connexion)
          navigate('/login', { state: { pendingEmailConfirmation: true } })
        }
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Section gauche - Formulaire (60%) */}
      <div className="w-full lg:w-3/5 bg-white flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        {/* Élément circulaire en bas à gauche */}
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-mint-DEFAULT rounded-full opacity-20 -translate-x-1/2 translate-y-1/2"></div>

        <div className="w-full max-w-md px-4 sm:px-0">
          {/* Logo */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <PharmaScanLogo />
          </div>

          {/* Titre */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 sm:mb-8 text-center">
            Créer un compte
          </h1>


          {/* Formulaire */}
          <form onSubmit={handleRegister} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition ${
                  fieldErrors.email 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-mint-DEFAULT'
                }`}
                placeholder="Entrer votre email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de la pharmacie
              </label>
              <input
                type="text"
                name="pharmacyName"
                value={formData.pharmacyName}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition ${
                  fieldErrors.pharmacyName 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-mint-DEFAULT'
                }`}
                placeholder="Entrer le nom de votre pharmacie"
              />
            </div>

            {/* Nom du propriétaire / représentant légal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du propriétaire / représentant légal
              </label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition ${
                  fieldErrors.ownerName 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-mint-DEFAULT'
                }`}
                placeholder="Entrer le nom du propriétaire"
              />
            </div>

            {/* Numéro d'agrément / licence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro d'agrément / licence de la pharmacie
              </label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition ${
                  fieldErrors.licenseNumber 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-mint-DEFAULT'
                }`}
                placeholder="Entrer le numéro d'agrément / licence"
              />
            </div>

            {/* Numéro de téléphone — indicatif = pays sélectionné */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone
              </label>
              <p className="text-xs text-gray-500 mb-2">
                L’indicatif suit automatiquement le pays choisi plus haut.
              </p>
              <div className="flex gap-2 items-stretch">
                <div
                  className={`flex items-center justify-center gap-2 px-3 min-w-[5.5rem] bg-gray-50 border rounded-lg ${
                    fieldErrors.phoneNumber ? 'border-red-500' : 'border-gray-200'
                  }`}
                  title={getPhoneCode(formData.country || 'CM').name}
                >
                  <span className="text-2xl leading-none" aria-hidden>
                    {getPhoneCode(formData.country || 'CM').flag}
                  </span>
                  <span className="font-semibold tabular-nums text-sm text-gray-800">
                    {getPhoneCode(formData.country || 'CM').code}
                  </span>
                </div>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`flex-1 min-w-0 px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition ${
                    fieldErrors.phoneNumber 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-200 focus:border-mint-DEFAULT'
                  }`}
                  placeholder="6 12 34 56 78"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                attestation de la pharmacie
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={formData.attestationFile ? formData.attestationFile.name : ''}
                  placeholder="importer le document"
                  className={`flex-1 px-4 py-3 bg-gray-50 border rounded-lg ${
                    fieldErrors.attestationFile 
                      ? 'border-red-500' 
                      : 'border-gray-200'
                  }`}
                />
                <label className="px-4 py-3 bg-gray-700 text-white rounded-lg cursor-pointer hover:bg-gray-800 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                  <Upload className="h-5 w-5 inline mr-2" />
                  importer
                  <input
                    type="file"
                    name="attestationFile"
                    onChange={handleChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                photo de la pharmacie
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={formData.photoFile ? formData.photoFile.name : ''}
                  placeholder="importer le document"
                  className={`flex-1 px-4 py-3 bg-gray-50 border rounded-lg ${
                    fieldErrors.photoFile 
                      ? 'border-red-500' 
                      : 'border-gray-200'
                  }`}
                />
                <label className="px-4 py-3 bg-gray-700 text-white rounded-lg cursor-pointer hover:bg-gray-800 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                  <Upload className="h-5 w-5 inline mr-2" />
                  importer
                  <input
                    type="file"
                    name="photoFile"
                    onChange={handleChange}
                    accept=".jpg,.jpeg,.png"
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Pays */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pays
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition ${
                  fieldErrors.country 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-200 focus:border-mint-DEFAULT'
                }`}
              >
                <option value="">Sélectionner un pays</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ville */}
            {formData.country && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ville
                </label>
                {availableCities.length > 0 ? (
                  <select
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition ${
                      fieldErrors.city 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-gray-200 focus:border-mint-DEFAULT'
                    }`}
                  >
                    <option value="">Sélectionner une ville</option>
                    {availableCities.map((city, index) => (
                      <option key={index} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                ) : (
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition ${
                          fieldErrors.city 
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-200 focus:border-mint-DEFAULT'
                        }`}
                        placeholder="Entrer le nom de la ville"
                      />
                )}
              </div>
            )}

            {/* Rue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rue / Avenue / Quartier
              </label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mint-DEFAULT focus:border-mint-DEFAULT outline-none transition"
                placeholder="Ex: Avenue Kennedy, Quartier Bastos"
              />
            </div>

            {/* Référence */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Référence / Point de repère
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-mint-DEFAULT focus:border-mint-DEFAULT outline-none transition"
                placeholder="Ex: Près du marché central, Face à la gare"
              />
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition pr-12 ${
                    fieldErrors.password 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : formData.password && Object.values(passwordStrength).every(v => v)
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-gray-200 focus:border-mint-DEFAULT'
                  }`}
                  placeholder="Entrer votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              
              {/* Indicateur de force du mot de passe */}
              {formData.password && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Le mot de passe doit contenir :</p>
                  <ul className="space-y-1 text-xs">
                    <li className={`flex items-center ${passwordStrength.length ? 'text-green-600' : 'text-gray-500'}`}>
                      <span className={`mr-2 ${passwordStrength.length ? 'text-green-500' : 'text-gray-400'}`}>
                        {passwordStrength.length ? '✓' : '○'}
                      </span>
                      Au moins 8 caractères
                    </li>
                    <li className={`flex items-center ${passwordStrength.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <span className={`mr-2 ${passwordStrength.uppercase ? 'text-green-500' : 'text-gray-400'}`}>
                        {passwordStrength.uppercase ? '✓' : '○'}
                      </span>
                      Une majuscule (A-Z)
                    </li>
                    <li className={`flex items-center ${passwordStrength.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                      <span className={`mr-2 ${passwordStrength.lowercase ? 'text-green-500' : 'text-gray-400'}`}>
                        {passwordStrength.lowercase ? '✓' : '○'}
                      </span>
                      Une minuscule (a-z)
                    </li>
                    <li className={`flex items-center ${passwordStrength.number ? 'text-green-600' : 'text-gray-500'}`}>
                      <span className={`mr-2 ${passwordStrength.number ? 'text-green-500' : 'text-gray-400'}`}>
                        {passwordStrength.number ? '✓' : '○'}
                      </span>
                      Un chiffre (0-9)
                    </li>
                    <li className={`flex items-center ${passwordStrength.special ? 'text-green-600' : 'text-gray-500'}`}>
                      <span className={`mr-2 ${passwordStrength.special ? 'text-green-500' : 'text-gray-400'}`}>
                        {passwordStrength.special ? '✓' : '○'}
                      </span>
                      Un caractère spécial (!@#$%^&*...)
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirmer le mot de passe */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition pr-12 ${
                    fieldErrors.confirmPassword 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                      ? 'border-green-500 focus:border-green-500'
                      : 'border-gray-200 focus:border-mint-DEFAULT'
                  }`}
                  placeholder="Confirmer votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                  title={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Cases juridiques obligatoires */}
            <div className="space-y-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Tu DOIS avoir ceci légalement :
              </p>
              
              <div className={`flex items-start space-x-3 ${fieldErrors.acceptTerms ? 'text-red-600' : ''}`}>
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className={`mt-1 w-4 h-4 text-mint-DEFAULT border-gray-300 rounded focus:ring-mint-DEFAULT ${
                    fieldErrors.acceptTerms ? 'border-red-500' : ''
                  }`}
                />
                <label className="text-sm text-gray-700 cursor-pointer">
                  J'accepte les{' '}
                  <Link
                    to="/conditions-utilisation"
                    target="_blank"
                    className="text-[#4FD1C7] hover:text-mint-dark hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    conditions générales d'utilisation
                  </Link>
                </label>
              </div>

              <div className={`flex items-start space-x-3 ${fieldErrors.acceptPrivacy ? 'text-red-600' : ''}`}>
                <input
                  type="checkbox"
                  name="acceptPrivacy"
                  checked={formData.acceptPrivacy}
                  onChange={handleChange}
                  className={`mt-1 w-4 h-4 text-mint-DEFAULT border-gray-300 rounded focus:ring-mint-DEFAULT ${
                    fieldErrors.acceptPrivacy ? 'border-red-500' : ''
                  }`}
                />
                <label className="text-sm text-gray-700 cursor-pointer">
                  J'accepte la{' '}
                  <Link
                    to="/politique-confidentialite"
                    target="_blank"
                    className="text-[#4FD1C7] hover:text-mint-dark hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    politique de confidentialité
                  </Link>
                </label>
              </div>
            </div>

            {/* Bouton de création */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-mint-dark text-white py-3 rounded-lg font-medium hover:bg-mint-DEFAULT hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md"
            >
              {loading ? 'Création...' : 'Créer un compte'}
            </button>
          </form>

          {/* Lien de connexion */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Vous avez déjà un compte ?{' '}
              <Link
                to="/login"
                className="text-[#4FD1C7] font-medium transition-all duration-200 hover:text-mint-dark hover:underline hover:bg-[#4FD1C7]/10 hover:px-2 hover:py-1 hover:rounded"
              >
                Connectez-vous
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Section droite - Fond coloré (40%) */}
      <div 
        className="lg:block lg:w-2/5 hidden relative overflow-hidden"
        style={{ 
          backgroundColor: '#4FD1C7',
          minHeight: '100vh'
        }}
      >
        {/* Éléments décoratifs animés en continu */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float-delayed"></div>
        <div className="absolute top-1/2 right-20 w-20 h-20 bg-white/5 rounded-full blur-lg animate-float-slow"></div>
        <div className="absolute bottom-1/3 left-20 w-16 h-16 bg-white/8 rounded-full blur-md animate-float-delayed-slow"></div>
      </div>
    </div>
  )
}
