import {
  T_PHARMACIE,
  T_PHARMACIEN,
  pharmacyRowId,
  splitPhoneForPharmacie,
} from './pharmacySchema'

/** Émis après mise à jour du profil pharmacie (photo, etc.) pour rafraîchir la barre / le layout. */
export const PHARMACY_PROFILE_UPDATED_EVENT = 'pharmacy-profile-updated'

/**
 * Supabase renvoie parfois un embed comme objet, parfois comme tableau (relation 1–1).
 */
export function normalizeEmbeddedPharmacy(pharmacist) {
  if (!pharmacist?.pharmacie) return null
  const p = pharmacist.pharmacie
  return Array.isArray(p) ? p[0] ?? null : p
}

/**
 * Résout la ligne pharmacie via pharmacien.pharmacie_id ou embed pharmacie.
 */
export async function resolvePharmacyForPharmacist(supabase, pharmacist) {
  if (!pharmacist) return null
  const embedded = normalizeEmbeddedPharmacy(pharmacist)
  if (embedded) return embedded

  const pid = pharmacist.pharmacie_id
  if (pid) {
    const { data, error } = await supabase
      .from(T_PHARMACIE)
      .select('*')
      .eq('pharmacie_id', pid)
      .maybeSingle()
    if (!error && data) return data
  }

  return null
}

const DEFAULT_ATTEST_PLACEHOLDER = 'pending'

/**
 * Crée une pharmacie minimale et lie pharmacien.pharmacie_id.
 */
export async function resolveOrCreatePharmacy(supabase, pharmacist, insertRow) {
  const existing = await resolvePharmacyForPharmacist(supabase, pharmacist)
  if (existing) return existing

  if (!pharmacist?.pharmacien_id && !pharmacist?.user_id) return null

  const phone = splitPhoneForPharmacie(insertRow.indicphone, insertRow.phone_number)
  const lat = insertRow.latitude ?? 0
  const lng = insertRow.longitude ?? 0

  const { data, error } = await supabase
    .from(T_PHARMACIE)
    .insert({
      name: insertRow.name || 'Pharmacie',
      adress: insertRow.adress || '—',
      pays: insertRow.pays || '—',
      ville: insertRow.ville || '—',
      quartier: insertRow.quartier || '—',
      agrementnumber: insertRow.agrementnumber || '—',
      attestationPath: insertRow.attestationPath || DEFAULT_ATTEST_PLACEHOLDER,
      justifPath: insertRow.justifPath || insertRow.attestationPath || DEFAULT_ATTEST_PLACEHOLDER,
      latitude: lat,
      longitude: lng,
      localisation: 0,
      indicphone: phone.indicphone,
      phone_number: phone.phone_number.toString(),
      profile_path: insertRow.profile_path ?? null,
      status: 'close',
      validate: false,
      exist: true,
      /** RLS supabase_rls_pharmacie_pharmascan.sql : SELECT après INSERT avant liaison. */
      created_for_user_id: pharmacist.user_id ?? null,
    })
    .select()
    .single()

  if (error) {
    const again = await resolvePharmacyForPharmacist(supabase, pharmacist)
    if (again) return again
    throw error
  }

  const pharmId = pharmacyRowId(data)
  await supabase
    .from(T_PHARMACIEN)
    .update({ pharmacie_id: pharmId })
    .eq('user_id', pharmacist.user_id)

  return data
}

const PHARMACIST_CORE = 'pharmacien_id, pharmacie_id, user_id, justifPath'

async function fetchPharmacistCore(supabase, userId) {
  const { data, error } = await supabase
    .from(T_PHARMACIEN)
    .select(PHARMACIST_CORE)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) console.warn('fetchPharmacistCore:', error.message, error)
  return data
}

/**
 * Garantit une ligne pharmacien (lien users ↔ pharmacie).
 */
export async function ensurePharmacistRow(supabase, user) {
  if (!user?.id) return null

  let pharmacist = await fetchPharmacistCore(supabase, user.id)
  if (pharmacist) return pharmacist

  try {
    const { data: pid, error: rpcErr } = await supabase.rpc('ensure_pharmacist_for_current_user')
    if (!rpcErr && pid) {
      pharmacist = await fetchPharmacistCore(supabase, user.id)
      if (pharmacist) return pharmacist
    }
    if (rpcErr) console.warn('ensure_pharmacist_for_current_user:', rpcErr.message || rpcErr)
  } catch (e) {
    console.warn('ensure_pharmacist_for_current_user:', e)
  }

  try {
    const { data: boot, error: bootErr } = await supabase.rpc('bootstrap_pharmacist_if_missing')
    if (!bootErr && boot?.ok) {
      pharmacist = await fetchPharmacistCore(supabase, user.id)
      if (pharmacist) return pharmacist
    }
    if (bootErr) console.warn('bootstrap_pharmacist_if_missing:', bootErr.message || bootErr)
  } catch (e) {
    console.warn('bootstrap_pharmacist_if_missing:', e)
  }

  const { data: inserted, error: insErr } = await supabase
    .from(T_PHARMACIEN)
    .insert({
      user_id: user.id,
      justifPath: '',
      responsability: 'pharmacien',
    })
    .select(PHARMACIST_CORE)
    .maybeSingle()

  if (!insErr && inserted) return inserted

  if (insErr) {
    pharmacist = await fetchPharmacistCore(supabase, user.id)
    if (pharmacist) return pharmacist
    console.error('ensurePharmacistRow insert:', insErr.message || insErr, insErr)
  }

  return null
}

/** ouvert | ferme | occupe — schéma pharmacie.status open | close */
export function getOperationalStatus(pharmacy) {
  if (!pharmacy) return 'ferme'
  if (pharmacy.statut_operationnel) {
    if (pharmacy.statut_operationnel === 'ouvert') return 'ouvert'
    return 'ferme'
  }
  if (pharmacy.status === 'open') return 'ouvert'
  if (['ouvert', 'ferme', 'occupe'].includes(pharmacy.status)) return pharmacy.status
  return 'ferme'
}

export function isPharmacyOpenForDisplay(pharmacy) {
  return getOperationalStatus(pharmacy) === 'ouvert'
}
