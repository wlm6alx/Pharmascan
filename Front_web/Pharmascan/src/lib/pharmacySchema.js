/**
 * Schéma BDD cible : public.pharmacie + public.pharmacien (+ public.users).
 * - pharmacie : attestationPath (attestation officine), profile_path (photo), lat/long, etc.
 * - pharmacien : justifPath (justificatif du pharmacien), user_id, pharmacie_id
 */

export const T_PHARMACIE = 'pharmacie'
export const T_PHARMACIEN = 'pharmacien'

/** Identifiant pharmacie (PK) */
export function pharmacyRowId(row) {
  if (!row) return null
  return row.pharmacie_id ?? row.id ?? null
}

/** Statut validation admin : validate boolean */
export function pharmacyValidationKey(ph) {
  if (!ph) return null
  if (typeof ph.validate === 'boolean') {
    return ph.validate ? 'approuvee' : 'en_attente'
  }
  if (ph.statut === 'approuvee' || ph.statut === 'en_attente') return ph.statut
  return ph.validate ? 'approuvee' : 'en_attente'
}

/** Ouverture : enum pharmacie_status open | close */
export function getPharmacieStatusOpen(ph) {
  return ph?.status === 'open'
}

/**
 * Téléphone : indicphone (text) + phone_number (bigint) — éviter dépassement JS.
 */
export function splitPhoneForPharmacie(phoneCode, phoneNumber) {
  const rawIndic = String(phoneCode || '').trim() || '+237'
  const indicphone = rawIndic.startsWith('+') ? rawIndic : `+${rawIndic.replace(/\D/g, '')}`
  const digits = String(phoneNumber || '').replace(/\D/g, '')
  const national = digits.slice(0, 15)
  let phone_number = 0n
  try {
    phone_number = national ? BigInt(national) : 0n
  } catch {
    phone_number = 0n
  }
  return { indicphone, phone_number }
}

/** Géolocalisation navigateur (coords WGS84) ; repli 0,0 si refus / indispo */
export function getBrowserGeolocation() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve({ latitude: 0, longitude: 0 })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => resolve({ latitude: 0, longitude: 0 }),
      { timeout: 10000, maximumAge: 120000, enableHighAccuracy: false }
    )
  })
}
