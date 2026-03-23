/** Émis après mise à jour du profil pharmacie (photo, etc.) pour rafraîchir la barre / le layout. */
export const PHARMACY_PROFILE_UPDATED_EVENT = 'pharmacy-profile-updated'

/**
 * Supabase renvoie parfois `pharmacies` comme objet, parfois comme tableau (relation 1–1).
 */
export function normalizeEmbeddedPharmacy(pharmacist) {
  if (!pharmacist?.pharmacies) return null
  const p = pharmacist.pharmacies
  return Array.isArray(p) ? p[0] ?? null : p
}

/**
 * Résout la ligne pharmacie même si l’embed `pharmacies(*)` est vide (ex. pharmacy_id non
 * synchronisé) ou si les politiques RLS bloquent l’embed — repli par id ou par pharmacist_id.
 */
export async function resolvePharmacyForPharmacist(supabase, pharmacist) {
  if (!pharmacist) return null
  const embedded = normalizeEmbeddedPharmacy(pharmacist)
  if (embedded) return embedded

  if (pharmacist.pharmacy_id) {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('id', pharmacist.pharmacy_id)
      .maybeSingle()
    if (!error && data) return data
  }

  if (pharmacist.id) {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('pharmacist_id', pharmacist.id)
      .maybeSingle()
    if (!error && data) return data
  }

  return null
}

/**
 * Si aucune pharmacie n’est lisible (ou absente), crée la ligne et lie `pharmacists.pharmacy_id`.
 * À utiliser quand resolvePharmacyForPharmacist renvoie null mais le pharmacien existe.
 */
export async function resolveOrCreatePharmacy(supabase, pharmacist, insertRow) {
  const existing = await resolvePharmacyForPharmacist(supabase, pharmacist)
  if (existing) return existing

  if (!pharmacist?.id) return null

  const { data, error } = await supabase
    .from('pharmacies')
    .insert({
      ...insertRow,
      pharmacist_id: pharmacist.id,
      status: 'pending',
      operational_status: 'closed',
      is_on_duty: false,
    })
    .select()
    .single()

  if (error) {
    const again = await resolvePharmacyForPharmacist(supabase, pharmacist)
    if (again) return again
    throw error
  }

  await supabase
    .from('pharmacists')
    .update({ pharmacy_id: data.id })
    .eq('id', pharmacist.id)

  return data
}

/**
 * Sans embed `pharmacies(*)` : l’embed peut faire échouer toute la requête si les politiques
 * sur `pharmacies` bloquent la relation (PostgREST).
 */
const PHARMACIST_CORE = 'id, pharmacy_id, first_name, last_name'

async function fetchPharmacistCore(supabase, userId) {
  const { data, error } = await supabase
    .from('pharmacists')
    .select(PHARMACIST_CORE)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) console.warn('fetchPharmacistCore:', error.message, error)
  return data
}

/**
 * Garantit une ligne `pharmacists` : SELECT minimal, RPC serveur (SECURITY DEFINER),
 * bootstrap pharmacie, puis INSERT client.
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
    .from('pharmacists')
    .insert({ user_id: user.id, email: user.email ?? null })
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

/** open | closed | busy — avec repli si ancienne base sans operational_status. */
export function getOperationalStatus(pharmacy) {
  if (!pharmacy) return 'closed'
  if (pharmacy.operational_status) return pharmacy.operational_status
  if (['open', 'closed', 'busy'].includes(pharmacy.status)) return pharmacy.status
  return 'closed'
}

/** Ouvert au public : operational_status === 'open' (ou repli legacy). */
export function isPharmacyOpenForDisplay(pharmacy) {
  return getOperationalStatus(pharmacy) === 'open'
}
