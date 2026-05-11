import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, AlertCircle, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react'
import PharmaScanLogo from '../components/PharmaScanLogo'
import { ConditionsUtilisationContent, PolitiqueConfidentialiteContent } from '../legal/LegalDocuments'
import { 
  getFormattedCountries,
  getAllCitiesByCountry,
  getCountryName
} from '../lib/locationData'
import { getPhoneCode } from '../lib/phoneCodes'
import {
  getBrowserGeolocation,
  splitPhoneForPharmacie,
  T_PHARMACIE,
  T_PHARMACIEN,
} from '../lib/pharmacySchema'
import { ensurePharmacistRow, resolveOrCreatePharmacy } from '../lib/pharmacyHelpers'

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
    attestationFile: null,
    photoFile: null,
    justifPharmacienFile: null,
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
  /** Affiche CGU ou politique dans une modale sans quitter la page d'inscription. */
  const [legalModal, setLegalModal] = useState(null)
  /** Message unique si le formulaire est incomplet. */
  const [fillRequiredOpen, setFillRequiredOpen] = useState(false)
  /** 1 = compte (email, mots de passe), 2 = pharmacie et documents. */
  const [formStep, setFormStep] = useState(1)

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

  /**
   * Téléphone pour raw_user_meta_data : format compact +<chiffres>, max 30 car.
   */
  const buildSignupPhoneMeta = () => {
    const code = String(formData.phoneCode || '').replace(/\D/g, '')
    const num = String(formData.phoneNumber || '').replace(/\D/g, '')
    if (!code && !num) return ''
    return `+${code}${num}`.slice(0, 30)
  }

  /** Username stable pour public.users si un trigger générique lit encore les métadonnées. */
  const buildSignupUsernameMeta = () => {
    const local = (formData.email || '').split('@')[0] || ''
    let slug = local.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    if (slug.length < 3) {
      slug = formData.ownerName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
    }
    if (slug.length < 3) slug = 'user_pharmascan'
    return `${slug.slice(0, 40)}_${Date.now().toString(36).slice(-5)}`
  }

  /** Tout champ utile renvoyé par GoTrue (souvent peu de détail pour les 500 SQL). */
  const signupErrorDebugText = (err) => {
    if (!err || typeof err !== 'object') return ''
    const bits = []
    if (err.message) bits.push(String(err.message))
    if (err.status != null) bits.push(`status=${err.status}`)
    for (const k of ['code', 'error_code', 'error_description', 'details', 'hint']) {
      if (err[k] != null && err[k] !== '') bits.push(`${k}=${String(err[k])}`)
    }
    return bits.join(' | ')
  }

  const formatSignupError = (err) => {
    const status = err?.status
    const msg = (err?.message || '').toLowerCase()

    if (status === 422 && msg.includes('already') && msg.includes('registered')) {
      return "Cet email est déjà utilisé. Connectez-vous ou utilisez une autre adresse."
    }
    if (msg.includes('captcha')) {
      return "Validation anti-robot requise (captcha). Désactivez le captcha côté Supabase ou configurez-le, puis réessayez."
    }
    if (msg.includes('password') && (msg.includes('weak') || msg.includes('strength'))) {
      return "Mot de passe trop faible. Utilisez au moins 8 caractères avec majuscule, minuscule, chiffre et caractère spécial."
    }
    if (msg.includes('password should be at least 12') || msg.includes('at least 12 characters')) {
      return "Mot de passe trop court. Utilisez au moins 12 caractères."
    }
    if (msg.includes('email rate limit') || msg.includes('rate limit')) {
      return "Trop de tentatives. Patientez quelques minutes puis réessayez."
    }
    if (msg.includes('signup') && msg.includes('disabled')) {
      return "Les inscriptions sont désactivées côté Supabase."
    }
    if (msg.includes('database error saving new user')) {
      const base =
        "Erreur base de données à l’inscription : le trigger public.handle_new_user() (ou une contrainte sur public.users / public.pharmacien) a échoué. " +
        "À faire côté Supabase : exécuter supabase_fix_handle_new_user_duplicate_trigger.sql (suppression du trigger BEFORE en double + fonction corrigée), puis consulter Logs → Postgres pour le message SQL exact."
      const extra = signupErrorDebugText(err)
      if (import.meta.env.DEV && extra && extra !== err?.message) {
        return `${base}\n\nDétail renvoyé par l’API : ${extra}`
      }
      return base
    }

    return err?.message || "Impossible de créer le compte. Vérifiez vos informations et réessayez."
  }

  /** Valide email + mots de passe (étape 1 uniquement). */
  const validateAccountFields = () => {
    const ne = {}

    if (!formData.email || formData.email.trim() === '') {
      ne.email = 'L\'email est obligatoire'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      ne.email = 'L\'email n\'est pas valide'
    }

    if (!formData.password || formData.password.trim() === '') {
      ne.password = 'Le mot de passe est obligatoire'
    } else {
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
        ne.password = `Le mot de passe doit contenir : ${passwordErrors.join(', ')}`
      }
    }

    if (!formData.confirmPassword || formData.confirmPassword.trim() === '') {
      ne.confirmPassword = 'La confirmation du mot de passe est obligatoire'
    } else if (formData.password !== formData.confirmPassword) {
      ne.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    return ne
  }

  const goNextStep = () => {
    const ne = validateAccountFields()
    if (Object.keys(ne).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...ne }))
      setFillRequiredOpen(true)
      return
    }
    setFieldErrors((prev) => {
      const copy = { ...prev }
      delete copy.email
      delete copy.password
      delete copy.confirmPassword
      return copy
    })
    setFormStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goPrevStep = () => {
    setFormStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    if (formStep === 1) {
      goNextStep()
      return
    }
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

    if (!formData.attestationFile) {
      errors.push('L\'attestation de la pharmacie est obligatoire')
      newFieldErrors.attestationFile = 'L\'attestation de la pharmacie est obligatoire'
    }

    if (!formData.photoFile) {
      errors.push('La photo de la pharmacie est obligatoire')
      newFieldErrors.photoFile = 'La photo de la pharmacie est obligatoire'
    }

    if (!formData.justifPharmacienFile) {
      errors.push('Le justificatif du pharmacien (carte professionnelle, etc.) est obligatoire')
      newFieldErrors.justifPharmacienFile =
        'Le justificatif du pharmacien (carte professionnelle, etc.) est obligatoire'
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
      const step1Keys = ['email', 'password', 'confirmPassword']
      setFormStep(step1Keys.some((k) => newFieldErrors[k]) ? 1 : 2)
      setFillRequiredOpen(true)
      setLoading(false)
      return
    }

    // Réinitialiser les erreurs de champs si la validation passe
    setFieldErrors({})
    setError('')

    try {
        const fullAddress = buildAddress()
        const phoneMeta = buildSignupPhoneMeta()

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              register_flow: 'pharmascan',
              pharmacy_name: formData.pharmacyName.trim(),
              address: fullAddress,
              owner_name: formData.ownerName.trim(),
              phone: phoneMeta,
              phone_digits: String(formData.phoneNumber || '').replace(/\D/g, ''),
              phone_code_plain: String(formData.phoneCode || '')
                .replace(/\D/g, '')
                .replace(/^\+/, '') || '237',
              license_number: formData.licenseNumber.trim(),
              country: formData.country,
              phone_code: formData.phoneCode,
              city: formData.city.trim(),
              street: formData.street.trim(),
              address_reference: formData.reference.trim(),
              // Requis par le trigger handle_new_user : les fichiers réels sont envoyés juste après signUp (storage).
              justifPath: 'pending',
              attestationPath: 'pending',
              // Compat triggers « public.users » / anciens scripts (ignorés si handle_new_user sort tôt sur pharmascan)
              name: formData.ownerName.trim(),
              username: buildSignupUsernameMeta(),
              role: 'pharmacien',
            },
          },
        })

        if (authError) {
          console.error('[Register] Supabase signUp error:', authError)
          console.error('[Register] signUp error (détail):', signupErrorDebugText(authError))
          throw new Error(formatSignupError(authError))
        }

        if (!authData.user) {
          throw new Error('Création du compte impossible. Réessayez ou utilisez un autre email.')
        }

        // Session immédiate : pharmacien + pharmacie créés ou mis à jour ici (sans dépendre du trigger)
        if (authData.session) {
          const pharmacist = await ensurePharmacistRow(supabase, authData.user)
          if (!pharmacist) {
            throw new Error(
              'Impossible de créer le profil pharmacien. Vérifiez les politiques RLS sur public.pharmacien et les RPC ensure_pharmacist / bootstrap, ou exécutez supabase_rls_pharmacien_authenticated.sql.'
            )
          }

          let attestationPath = null
          let photoUrl = null
          let justifPharmacienPath = null

          if (formData.attestationFile) {
            const { data: attestationData, error: attestationError } = await supabase.storage
              .from('pharmacy-documents')
              .upload(`${authData.user.id}/attestation-pharmacie-${Date.now()}`, formData.attestationFile)

            if (attestationError) {
              throw new Error(
                `Envoi de l’attestation refusé : ${attestationError.message}. Vérifiez les politiques Storage.`
              )
            }
            attestationPath = attestationData.path
          }

          if (formData.justifPharmacienFile) {
            const { data: jData, error: jErr } = await supabase.storage
              .from('pharmacy-documents')
              .upload(`${authData.user.id}/justif-pharmacien-${Date.now()}`, formData.justifPharmacienFile)

            if (jErr) {
              throw new Error(
                `Envoi du justificatif pharmacien refusé : ${jErr.message}. Vérifiez les politiques Storage.`
              )
            }
            justifPharmacienPath = jData.path
          }

          if (formData.photoFile) {
            const { data: photoData, error: photoError } = await supabase.storage
              .from('pharmacy-photos')
              .upload(`${authData.user.id}/photo-${Date.now()}`, formData.photoFile)

            if (photoError) {
              throw new Error(
                `Envoi de la photo refusé : ${photoError.message}. Vérifiez les politiques Storage.`
              )
            }
            const { data: { publicUrl } } = supabase.storage
              .from('pharmacy-photos')
              .getPublicUrl(photoData.path)
            photoUrl = publicUrl
          }

          const coords = await getBrowserGeolocation()
          const phone = splitPhoneForPharmacie(formData.phoneCode, formData.phoneNumber)
          const countryName = getCountryName(formData.country) || formData.country || '—'
          const quartier =
            [formData.street, formData.reference].filter(Boolean).join(' — ') || '—'

          const pharmacyPayload = {
            name: formData.pharmacyName.trim(),
            adress: fullAddress || '—',
            pays: countryName,
            ville: (formData.city || '').trim() || '—',
            quartier,
            agrementnumber: formData.licenseNumber.trim(),
            attestationPath: attestationPath || 'pending',
            justifPath: attestationPath || 'pending',
            profile_path: photoUrl,
            latitude: coords.latitude,
            longitude: coords.longitude,
            localisation: 0,
            indicphone: phone.indicphone,
            phone_number: phone.phone_number.toString(),
          }

          if (pharmacist.pharmacie_id) {
            const { error: upPharmacieErr } = await supabase
              .from(T_PHARMACIE)
              .update({
                name: pharmacyPayload.name,
                adress: pharmacyPayload.adress,
                pays: pharmacyPayload.pays,
                ville: pharmacyPayload.ville,
                quartier: pharmacyPayload.quartier,
                agrementnumber: pharmacyPayload.agrementnumber,
                attestationPath: pharmacyPayload.attestationPath,
                justifPath: pharmacyPayload.justifPath,
                profile_path: pharmacyPayload.profile_path,
                latitude: pharmacyPayload.latitude,
                longitude: pharmacyPayload.longitude,
                localisation: pharmacyPayload.localisation,
                indicphone: pharmacyPayload.indicphone,
                phone_number: pharmacyPayload.phone_number,
              })
              .eq('pharmacie_id', pharmacist.pharmacie_id)

            if (upPharmacieErr) throw upPharmacieErr
          } else {
            await resolveOrCreatePharmacy(supabase, pharmacist, pharmacyPayload)
          }

          if (justifPharmacienPath) {
            const { error: upPhErr } = await supabase
              .from(T_PHARMACIEN)
              .update({ justifPath: justifPharmacienPath })
              .eq('user_id', authData.user.id)
            if (upPhErr) throw upPhErr
          }

          navigate('/login', { state: { registrationComplete: true } })
        } else {
          // Pas de session tout de suite (confirmation e-mail) : impossible d’insérer pharmacie côté client (RLS).
          // Déployez un trigger handle_new_user qui crée pharmacie + pharmacien depuis raw_user_meta_data, ou désactivez la confirmation e-mail pour ce flux.
          navigate('/login', { state: { pendingEmailConfirmation: true } })
        }
    } catch (err) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  const confirmPasswordMismatch =
    formData.confirmPassword.trim().length > 0 &&
    formData.password !== formData.confirmPassword

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
          <form
            onSubmit={handleRegister}
            className="space-y-4 sm:space-y-6"
          >
            <div
              className="w-full px-1"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={2}
              aria-valuenow={formStep}
              aria-valuetext={
                formStep === 1
                  ? 'Première partie du formulaire'
                  : 'Deuxième partie du formulaire'
              }
            >
              <div className="flex w-full gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 shadow-inner ring-1 ring-black/[0.04]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-mint-dark to-[#5eead4] shadow-sm transition-[width] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] ${
                      formStep >= 1 ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 shadow-inner ring-1 ring-black/[0.04]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-mint-dark to-[#5eead4] shadow-sm transition-[width] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] ${
                      formStep >= 2 ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            {formStep === 1 && (
              <div className="space-y-4 sm:space-y-6">
                <p className="text-sm font-medium text-gray-800">Vos informations</p>
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
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword || confirmPasswordMismatch)}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-mint-DEFAULT outline-none transition pr-12 ${
                    fieldErrors.confirmPassword || confirmPasswordMismatch
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
              {(fieldErrors.confirmPassword || confirmPasswordMismatch) && (
                <p className="mt-1.5 text-sm text-red-600" role="alert">
                  {fieldErrors.confirmPassword || 'Les mots de passe ne correspondent pas.'}
                </p>
              )}
              {!fieldErrors.confirmPassword &&
                !confirmPasswordMismatch &&
                formData.confirmPassword &&
                formData.password === formData.confirmPassword && (
                  <p className="mt-1.5 text-sm text-green-600">Les mots de passe correspondent.</p>
                )}
            </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <span className="w-10 shrink-0" aria-hidden />
                  <button
                    type="button"
                    onClick={goNextStep}
                    className="inline-flex items-center gap-2 rounded-lg bg-mint-dark px-5 py-3 text-sm font-medium text-white shadow-md transition hover:bg-mint-DEFAULT hover:shadow-lg active:scale-[0.98]"
                  >
                    Suivant
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </div>
            )}

            {formStep === 2 && (
              <div className="space-y-4 sm:space-y-6">
                <p className="text-sm font-medium text-gray-800">Informations de la pharmacie</p>

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
                    Numéro de téléphone
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    L&apos;indicatif suit automatiquement le pays choisi plus haut.
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
                        fieldErrors.attestationFile ? 'border-red-500' : 'border-gray-200'
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
                        fieldErrors.photoFile ? 'border-red-500' : 'border-gray-200'
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Justificatif du pharmacien 
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={formData.justifPharmacienFile ? formData.justifPharmacienFile.name : ''}
                      placeholder="importer le document"
                      className={`flex-1 px-4 py-3 bg-gray-50 border rounded-lg ${
                        fieldErrors.justifPharmacienFile ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    <label className="px-4 py-3 bg-gray-700 text-white rounded-lg cursor-pointer hover:bg-gray-800 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                      <Upload className="h-5 w-5 inline mr-2" />
                      importer
                      <input
                        type="file"
                        name="justifPharmacienFile"
                        onChange={handleChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-2">
                  <button
                    type="button"
                    onClick={goPrevStep}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50 active:scale-[0.98]"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                    Précédent
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="min-w-[10rem] flex-1 rounded-lg bg-mint-dark py-3 text-sm font-medium text-white shadow-md transition hover:bg-mint-DEFAULT hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:flex-initial sm:min-w-[12rem]"
                  >
                    {loading ? 'Création...' : 'Créer un compte'}
                  </button>
                </div>

                <p className="text-center text-sm leading-relaxed text-gray-600">
                  En créant votre compte sur PharmaScan, vous acceptez les{' '}
                  <button
                    type="button"
                    className="inline p-0 align-baseline font-medium text-[#4FD1C7] underline decoration-[#4FD1C7]/35 underline-offset-2 transition hover:text-mint-dark hover:decoration-mint-dark"
                    onClick={() => setLegalModal('terms')}
                  >
                    Conditions générales d&apos;utilisation
                  </button>{' '}
                  et la{' '}
                  <button
                    type="button"
                    className="inline p-0 align-baseline font-medium text-[#4FD1C7] underline decoration-[#4FD1C7]/35 underline-offset-2 transition hover:text-mint-dark hover:decoration-mint-dark"
                    onClick={() => setLegalModal('privacy')}
                  >
                    Politique de confidentialité
                  </button>{' '}
                  de PharmaScan.
                </p>
              </div>
            )}
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
        className="lg:flex lg:w-2/5 hidden items-center justify-center p-8 relative overflow-hidden"
        style={{
          backgroundColor: '#4FD1C7',
          minHeight: '100vh',
        }}
      >
        {/* Éléments décoratifs animés en continu */}
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-24 h-24 bg-white/10 rounded-full blur-xl animate-float-delayed"></div>
        <div className="absolute top-1/2 right-20 w-20 h-20 bg-white/5 rounded-full blur-lg animate-float-slow"></div>
        <div className="absolute bottom-1/3 left-20 w-16 h-16 bg-white/8 rounded-full blur-md animate-float-delayed-slow"></div>

        <div className="max-w-md text-white relative z-10 text-center lg:text-left">
          <h2 className="text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            <span className="inline-block animate-fade-slide-up">Bienvenue sur</span>
            <br />
            <span className="inline-block mt-3 animate-fade-slide-up-delayed animate-glow-text-continuous">
              PharmaScan
            </span>
          </h2>
          <p className="text-2xl lg:text-3xl font-semibold opacity-95 animate-fade-slide-up-delayed-2 mt-6 leading-snug">
            Créez votre compte pharmacie et rejoignez le réseau : la santé de vos patients, plus proche encore.
          </p>
        </div>
      </div>

      {legalModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setLegalModal(null)}
            aria-label="Fermer la fenêtre"
          />
          <div className="relative z-10 flex w-full max-w-2xl max-h-[90vh] flex-col rounded-t-2xl bg-white shadow-xl sm:max-h-[85vh] sm:rounded-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 id="legal-modal-title" className="pr-8 text-lg font-semibold text-gray-900">
                {legalModal === 'terms'
                  ? 'Conditions générales d’utilisation'
                  : 'Politique de confidentialité'}
              </h2>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {legalModal === 'terms' ? (
                <ConditionsUtilisationContent />
              ) : (
                <PolitiqueConfidentialiteContent />
              )}
            </div>
            <div className="shrink-0 border-t border-gray-200 px-4 py-3">
              <button
                type="button"
                className="w-full rounded-lg bg-mint-dark py-3 font-medium text-white transition hover:bg-mint-DEFAULT"
                onClick={() => setLegalModal(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {fillRequiredOpen && (
        <div
          className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fill-required-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setFillRequiredOpen(false)}
            aria-label="Fermer"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" aria-hidden />
            </div>
            <p id="fill-required-title" className="text-base font-medium text-gray-900">
              Veuillez remplir tous les champs obligatoires.
            </p>
            <button
              type="button"
              className="mt-6 w-full rounded-xl bg-mint-dark py-3 text-sm font-semibold text-white transition hover:bg-mint-DEFAULT"
              onClick={() => setFillRequiredOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
