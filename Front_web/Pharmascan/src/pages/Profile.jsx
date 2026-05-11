import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  X,
  Edit,
  Save,
  Building2,
  User,
  Phone,
  MapPin,
  FileText,
  Mail,
  Upload,
  Camera,
  Image,
  Eye,
  EyeOff,
  Lock,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { getFormattedCountries, getAllCitiesByCountry, getCountryName } from '../lib/locationData'
import { getBrowserGeolocation, splitPhoneForPharmacie, T_PHARMACIE, T_PHARMACIEN } from '../lib/pharmacySchema'
import { getPhoneCode } from '../lib/phoneCodes'
import {
  ensurePharmacistRow,
  PHARMACY_PROFILE_UPDATED_EVENT,
  resolvePharmacyForPharmacist,
  resolveOrCreatePharmacy,
} from '../lib/pharmacyHelpers'
import { parseLegacyAddressLine } from '../lib/profileAddress'

const COORD_NEAR_ZERO = 1e-5

function pharmacyCoordsUsable(lat, lng) {
  const la = Number(lat)
  const lo = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false
  if (Math.abs(la) < COORD_NEAR_ZERO && Math.abs(lo) < COORD_NEAR_ZERO) return false
  return true
}

/** Lien unique (lat + lon) vers la carte OpenStreetMap. */
function pharmacyMapExternalUrl(lat, lng) {
  const la = Number(lat)
  const lo = Number(lng)
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=16/${la}/${lo}`
}

function pharmacyMapEmbedUrl(lat, lng) {
  const la = Number(lat)
  const lo = Number(lng)
  const d = 0.015
  const bbox = `${lo - d},${la - d},${lo + d},${la + d}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${la}%2C${lo}`
}

export default function Profile() {
  const { user } = useAuth()
  const [pharmacy, setPharmacy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  /** Notification après enregistrement / erreur (remplace alert natif) */
  const [notice, setNotice] = useState(null)
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
    justifPharmacienFile: null,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    latitude: 0,
    longitude: 0,
  })
  const [attestationUrl, setAttestationUrl] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [justifPharmacienUrl, setJustifPharmacienUrl] = useState(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  })
  const [availableCities, setAvailableCities] = useState([])
  const [countries] = useState(() => getFormattedCountries())

  useEffect(() => {
    fetchPharmacy()
  }, [user])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 6500)
    return () => clearTimeout(t)
  }, [notice])

  const showNotice = (variant, title, message) => {
    setNotice({ variant, title, message })
  }

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

  /** Indicatif toujours aligné sur le pays (corrige aussi les données incohérentes en base). */
  useEffect(() => {
    const country = formData.country || 'CM'
    const { code } = getPhoneCode(country)
    setFormData((prev) => (prev.phoneCode === code ? prev : { ...prev, phoneCode: code }))
  }, [formData.country])

  const fetchPharmacy = async () => {
    try {
      if (!user?.id) {
        setLoading(false)
        return
      }
      const pharmacist = await ensurePharmacistRow(supabase, user)

        if (!pharmacist) {
          setPharmacy(null)
          setAttestationUrl(null)
          setPhotoUrl(null)
          setJustifPharmacienUrl(null)
          setFormData((prev) => ({
            ...prev,
            email: user?.email || '',
          }))
          return
        }

        const pharm = await resolvePharmacyForPharmacist(supabase, pharmacist)
        const ownerMeta = (
          user?.user_metadata?.owner_name ||
          user?.user_metadata?.name ||
          ''
        ).trim()

        if (pharm) {
          setPharmacy(pharm)
          const legacy = parseLegacyAddressLine(pharm.adress)
          const countryMatch = countries.find((c) => c.name === pharm.pays)
          const country = countryMatch?.code || 'CM'
          const pc = pharm.indicphone || getPhoneCode(country).code
          setFormData({
            email: user?.email || '',
            pharmacyName: pharm.name || '',
            ownerName: ownerMeta,
            licenseNumber: pharm.agrementnumber || '',
            country,
            phoneCode: pc,
            phoneNumber: String(pharm.phone_number ?? ''),
            city: pharm.ville || legacy.city,
            street: pharm.quartier || legacy.street,
            reference: legacy.reference,
            attestationFile: null,
            photoFile: null,
            justifPharmacienFile: null,
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            latitude: pharm.latitude ?? 0,
            longitude: pharm.longitude ?? 0,
          })

          if (pharm.attestationPath) {
            const { data } = await supabase.storage
              .from('pharmacy-documents')
              .createSignedUrl(pharm.attestationPath, 60 * 10)
            setAttestationUrl(data?.signedUrl || null)
          } else {
            setAttestationUrl(null)
          }

          setPhotoUrl(pharm.profile_path || null)

          if (pharmacist?.justifPath) {
            const { data } = await supabase.storage
              .from('pharmacy-documents')
              .createSignedUrl(pharmacist.justifPath, 60 * 10)
            setJustifPharmacienUrl(data?.signedUrl || null)
          } else {
            setJustifPharmacienUrl(null)
          }
        } else {
          setPharmacy(null)
          setAttestationUrl(null)
          setPhotoUrl(null)
          setJustifPharmacienUrl(null)
          setFormData((prev) => ({
            ...prev,
            email: user?.email || '',
            ownerName: ownerMeta || prev.ownerName,
          }))
        }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, type, files } = e.target
    if (type === 'file') {
      const file = files?.[0] ?? null
      setFormData((prev) => ({
        ...prev,
        [name]: file,
      }))
      return
    }

    const { value } = e.target
    if (name === 'country') {
      // Mettre à jour le code téléphonique quand le pays change
      try {
        const phoneData = getPhoneCode(value)
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          phoneCode: phoneData.code,
          city: '',
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

  const applyGeolocation = async () => {
    setGeoLoading(true)
    try {
      const { latitude, longitude } = await getBrowserGeolocation()
      setFormData((prev) => ({ ...prev, latitude, longitude }))
    } finally {
      setGeoLoading(false)
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
    if (!user?.id) {
      showNotice('error', 'Session expirée', 'Reconnectez-vous pour modifier votre profil.')
      return
    }
    const pwdNew = (formData.newPassword || '').trim()
    const pwdCur = (formData.currentPassword || '').trim()
    const pwdConf = (formData.confirmPassword || '').trim()

    if (pwdNew.length > 0) {
      if (!pwdCur) {
        showNotice(
          'error',
          'Mot de passe incomplet',
          'Pour définir un nouveau mot de passe, renseignez d’abord le mot de passe actuel.'
        )
        return
      }
      if (pwdNew !== pwdConf) {
        showNotice('error', 'Mots de passe différents', 'Le nouveau mot de passe et sa confirmation ne correspondent pas.')
        return
      }
      if (
        !passwordStrength.length ||
        !passwordStrength.uppercase ||
        !passwordStrength.lowercase ||
        !passwordStrength.number ||
        !passwordStrength.special
      ) {
        showNotice(
          'error',
          'Mot de passe trop faible',
          'Utilisez au moins 8 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial.'
        )
        return
      }
    }

    setSaving(true)
    try {
      if (pwdNew.length > 0) {
        const { error: updateError } = await supabase.auth.updateUser({
          password: pwdNew,
        })
        if (updateError) throw updateError
      }

      let attestationUrlToSave = attestationUrl
      let photoUrlToSave = photoUrl
      let attestationPathToSave = null
      let justifPharmacienPathToSave = null
      let justifPharmacienUrlToSave = justifPharmacienUrl

      if (formData.attestationFile) {
        const { data: attestationData, error: attestationError } = await supabase.storage
          .from('pharmacy-documents')
          .upload(`${user.id}/attestation-pharmacie-${Date.now()}`, formData.attestationFile, {
            upsert: true,
            contentType: formData.attestationFile.type || undefined,
          })

        if (attestationError) {
          throw new Error(
            `Envoi de l’attestation refusé : ${attestationError.message}. Vérifiez le bucket « pharmacy-documents » et les politiques Storage (insert pour les chemins ${user.id}/…).`
          )
        }
        if (!attestationData?.path) {
          throw new Error('Envoi de l’attestation : aucun chemin retourné par le stockage.')
        }
        attestationPathToSave = attestationData.path
        const { data: signedAttest } = await supabase.storage
          .from('pharmacy-documents')
          .createSignedUrl(attestationData.path, 60 * 10)
        attestationUrlToSave = signedAttest?.signedUrl || attestationUrlToSave
      }

      if (formData.justifPharmacienFile) {
        const { data: jData, error: jErr } = await supabase.storage
          .from('pharmacy-documents')
          .upload(`${user.id}/justif-pharmacien-${Date.now()}`, formData.justifPharmacienFile, {
            upsert: true,
            contentType: formData.justifPharmacienFile.type || undefined,
          })
        if (jErr) {
          throw new Error(
            `Envoi du justificatif pharmacien refusé : ${jErr.message}. Vérifiez les politiques Storage sur « pharmacy-documents ».`
          )
        }
        if (!jData?.path) {
          throw new Error('Envoi du justificatif : aucun chemin retourné.')
        }
        justifPharmacienPathToSave = jData.path
        const { data: signedJustif } = await supabase.storage
          .from('pharmacy-documents')
          .createSignedUrl(jData.path, 60 * 10)
        justifPharmacienUrlToSave = signedJustif?.signedUrl || justifPharmacienUrlToSave
      }

      if (formData.photoFile) {
        const { data: photoData, error: photoError } = await supabase.storage
          .from('pharmacy-photos')
          .upload(`${user.id}/photo-${Date.now()}`, formData.photoFile, {
            upsert: true,
            contentType: formData.photoFile.type || undefined,
          })

        if (photoError) {
          throw new Error(
            `Envoi de la photo refusé : ${photoError.message}. Vérifiez le bucket « pharmacy-photos » (public ou RLS lecture) et les politiques Storage.`
          )
        }
        if (!photoData?.path) {
          throw new Error('Envoi de la photo : aucun chemin retourné.')
        }
        const { data: pub } = supabase.storage.from('pharmacy-photos').getPublicUrl(photoData.path)
        photoUrlToSave = pub?.publicUrl || photoUrlToSave
      }

      const pharmacist = await ensurePharmacistRow(supabase, user)

      if (!pharmacist) {
        throw new Error(
          'Impossible de créer ou charger votre fiche pharmacien. Vérifiez votre connexion et les droits RLS.'
        )
      }

      const address = buildAddress()
      const phone = splitPhoneForPharmacie(formData.phoneCode, formData.phoneNumber)
      const paysLabel = getCountryName(formData.country) || formData.country || '—'
      const quartier =
        [formData.street, formData.reference].filter(Boolean).join(' — ') || '—'

      let row = await resolvePharmacyForPharmacist(supabase, pharmacist)

      const lat = Number(formData.latitude) || 0
      const lng = Number(formData.longitude) || 0

      const updateData = {
        name: formData.pharmacyName,
        adress: address || '—',
        pays: paysLabel,
        ville: formData.city || '—',
        quartier,
        agrementnumber: formData.licenseNumber,
        indicphone: phone.indicphone,
        phone_number: phone.phone_number.toString(),
        latitude: lat,
        longitude: lng,
        localisation: 0,
      }
      if (attestationPathToSave) {
        updateData.attestationPath = attestationPathToSave
        updateData.justifPath = attestationPathToSave
      }
      if (photoUrlToSave) updateData.profile_path = photoUrlToSave

      if (!row) {
        row = await resolveOrCreatePharmacy(supabase, pharmacist, {
          ...updateData,
          attestationPath: updateData.attestationPath || 'pending',
          justifPath: updateData.justifPath || updateData.attestationPath || 'pending',
          profile_path: photoUrlToSave ?? null,
        })
      } else {
        const { error } = await supabase
          .from(T_PHARMACIE)
          .update(updateData)
          .eq('pharmacie_id', row.pharmacie_id)

        if (error) throw error
      }

      if (justifPharmacienPathToSave) {
        const { error: jUp } = await supabase
          .from(T_PHARMACIEN)
          .update({ justifPath: justifPharmacienPathToSave })
          .eq('user_id', user.id)
        if (jUp) throw jUp
      }

      if (!row?.pharmacie_id) {
        throw new Error('Impossible d’enregistrer la pharmacie. Réessayez ou contactez le support.')
      }

      setJustifPharmacienUrl(justifPharmacienUrlToSave)

      // Réinitialiser mot de passe + fichiers (évite un second envoi du même fichier)
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        attestationFile: null,
        photoFile: null,
        justifPharmacienFile: null,
      }))

      await fetchPharmacy()
      window.dispatchEvent(new Event(PHARMACY_PROFILE_UPDATED_EVENT))
      setShowModal(false)
      showNotice(
        'success',
        pwdNew.length > 0 ? 'Tout est à jour' : 'Profil enregistré',
        pwdNew.length > 0
          ? 'Vos informations et votre nouveau mot de passe ont été enregistrés.'
          : 'Les modifications de votre pharmacie ont bien été sauvegardées.'
      )
    } catch (error) {
      showNotice(
        'error',
        'Enregistrement impossible',
        error?.message || 'Une erreur est survenue. Réessayez dans un instant.'
      )
    } finally {
      setSaving(false)
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
    <>
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
                : pharmacy
                  ? `${pharmacy.indicphone || ''} ${pharmacy.phone_number ?? ''}`.trim() || '-'
                  : '-'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-5 w-5 text-[#0b8fac]" />
              <label className="text-sm font-semibold text-gray-700">Adresse</label>
            </div>
            <p className="text-gray-900 font-medium">
              {[formData.city, formData.street, formData.reference].filter(Boolean).join(' - ') ||
                pharmacy?.adress ||
                '-'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200 md:col-span-2">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-5 w-5 text-[#0b8fac]" />
              <label className="text-sm font-semibold text-gray-700">Localisation GPS</label>
            </div>
            {(() => {
              const lat = pharmacy?.latitude ?? formData.latitude
              const lng = pharmacy?.longitude ?? formData.longitude
              if (!pharmacyCoordsUsable(lat, lng)) {
                return (
                  <p className="text-gray-600 text-sm">
                    Aucune position enregistrée. Définissez-la depuis « Modifier le profil ».
                  </p>
                )
              }
              const href = pharmacyMapExternalUrl(lat, lng)
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[#0b8fac] font-semibold text-sm hover:underline"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  Voir sur la carte
                </a>
              )
            })()}
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
            {saving && (
              <div
                className="absolute inset-0 z-20 bg-white/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-4"
                aria-busy="true"
                aria-live="polite"
              >
                <Loader2 className="h-12 w-12 text-[#0b8fac] animate-spin" strokeWidth={2.5} />
                <p className="text-base font-semibold text-gray-800">Enregistrement en cours…</p>
                <p className="text-sm text-gray-500 text-center max-w-xs px-4">
                  Envoi des fichiers et mise à jour de votre pharmacie. Merci de patienter.
                </p>
              </div>
            )}
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

              {/* Téléphone — indicatif dérivé du pays */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Téléphone
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  L’indicatif correspond automatiquement au pays sélectionné ci-dessus.
                </p>
                <div className="flex gap-3 items-stretch">
                  <div
                    className="flex items-center justify-center gap-2 px-3 min-w-[5.5rem] bg-white border-2 border-gray-200 rounded-xl text-gray-800"
                    title={getPhoneCode(formData.country || 'CM').name}
                  >
                    <span className="text-2xl leading-none" aria-hidden>
                      {getPhoneCode(formData.country || 'CM').flag}
                    </span>
                    <span className="font-semibold tabular-nums text-sm">
                      {getPhoneCode(formData.country || 'CM').code}
                    </span>
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    placeholder="Numéro de téléphone"
                    className="flex-1 min-w-0 px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
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
                  Référence / Point de repère{' '}
                  <span className="font-normal text-gray-500">(facultatif)</span>
                </label>
                <input
                  type="text"
                  name="reference"
                  value={formData.reference}
                  onChange={handleChange}
                  placeholder="Optionnel (point de repère, repère proche…)"
                  className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#0b8fac] focus:border-[#0b8fac] transition-all shadow-sm hover:shadow-md"
                />
              </div>

              {/* Localisation (carte — pas d’affichage brut lat/lon) */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <div className="flex items-center gap-2 mb-2.5">
                  <MapPin className="h-5 w-5 text-[#0b8fac]" />
                  <span className="text-sm font-semibold text-gray-700">Localisation (carte)</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Position enregistrée avec votre pharmacie. Utilisez le bouton pour la mettre à jour depuis cet
                  appareil, vérifiez sur la carte puis enregistrez le profil.
                </p>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <button
                    type="button"
                    onClick={applyGeolocation}
                    disabled={geoLoading}
                    className="px-4 py-3 bg-[#0b8fac] text-white rounded-xl text-sm font-semibold hover:bg-[#0a7085] disabled:opacity-50 transition-all shadow-sm"
                  >
                    {geoLoading ? 'Localisation…' : 'Utiliser ma position'}
                  </button>
                  {pharmacyCoordsUsable(formData.latitude, formData.longitude) && (
                    <a
                      href={pharmacyMapExternalUrl(formData.latitude, formData.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 bg-white border-2 border-[#0b8fac] text-[#0b8fac] rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Ouvrir sur la carte
                    </a>
                  )}
                </div>
                {pharmacyCoordsUsable(formData.latitude, formData.longitude) ? (
                  <div className="rounded-xl overflow-hidden border-2 border-gray-200 bg-gray-100 h-56 w-full">
                    <iframe
                      title="Aperçu de la position sur la carte"
                      className="w-full h-full border-0"
                      src={pharmacyMapEmbedUrl(formData.latitude, formData.longitude)}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    La carte s’affichera après une première position (bouton ci-dessus).
                  </p>
                )}
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

              {/* Justificatif pharmacien */}
              <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                  Justificatif du pharmacien (fichier distinct de l&apos;attestation officine)
                </label>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    readOnly
                    value={
                      formData.justifPharmacienFile
                        ? formData.justifPharmacienFile.name
                        : justifPharmacienUrl
                          ? 'Document actuel'
                          : ''
                    }
                    placeholder="Aucun fichier sélectionné"
                    className="flex-1 px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl"
                  />
                  <label className="px-6 py-3.5 bg-[#0b8fac] text-white rounded-xl cursor-pointer hover:bg-[#0a7085] transition-all duration-200 shadow-md hover:shadow-lg border-2 border-[#0b8fac] hover:border-[#0a7085] flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    <span>Importer</span>
                    <input
                      type="file"
                      name="justifPharmacienFile"
                      onChange={handleChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                  </label>
                </div>
                {justifPharmacienUrl && !formData.justifPharmacienFile && (
                  <div className="mt-3">
                    <a
                      href={justifPharmacienUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      <FileText className="h-5 w-5" />
                      <span>Voir le justificatif actuel</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Section changement de mot de passe */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Lock className="h-5 w-5 text-[#0b8fac]" />
                  <h3 className="text-lg font-bold text-gray-900">Changer le mot de passe</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Facultatif : laissez ces champs vides si vous ne souhaitez modifier que les autres informations.
                </p>

                <div className="space-y-4">
                  {/* Mot de passe actuel */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2.5">
                      Mot de passe actuel
                      <span className="font-normal text-gray-500"> (si nouveau mot de passe)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        name="currentPassword"
                        autoComplete="off"
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
                      <span className="font-normal text-gray-500"> (optionnel)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        autoComplete="new-password"
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
                      <span className="font-normal text-gray-500"> (optionnel)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        autoComplete="new-password"
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
                  disabled={saving}
                  className="flex-1 px-6 py-3.5 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0b8fac] text-white rounded-xl font-semibold hover:bg-[#0a7085] transition-all duration-200 shadow-lg hover:shadow-xl border-2 border-[#0b8fac] hover:border-[#0a7085] transform hover:scale-105 disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:bg-[#0b8fac]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                      <span>Enregistrement…</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 shrink-0" />
                      <span>Enregistrer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notice && (
        <div
          className="fixed bottom-6 left-1/2 z-[100] w-[min(92vw,26rem)] -translate-x-1/2 px-2"
          role="alert"
        >
          <div
            className={`rounded-2xl border-2 shadow-2xl p-5 flex gap-4 items-start backdrop-blur-sm ${
              notice.variant === 'success'
                ? 'bg-gradient-to-br from-white via-white to-emerald-50/90 border-emerald-200/90'
                : 'bg-gradient-to-br from-white via-white to-red-50/90 border-red-200/90'
            }`}
          >
            {notice.variant === 'success' ? (
              <div className="rounded-full bg-emerald-100 p-2 shrink-0">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" strokeWidth={2.25} />
              </div>
            ) : (
              <div className="rounded-full bg-red-100 p-2 shrink-0">
                <AlertCircle className="h-7 w-7 text-red-600" strokeWidth={2.25} />
              </div>
            )}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-gray-900 text-lg leading-tight">{notice.title}</p>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{notice.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}
