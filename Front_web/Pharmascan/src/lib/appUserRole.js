/**
 * Rôle applicatif dans public.users (pas auth.users).
 * L’espace PharmaScan n’accepte que role = 'pharmacien'.
 *
 * Utilise la RPC get_current_app_role() (SECURITY DEFINER) pour éviter
 * permission denied sur public.users si GRANT/RLS ne sont pas encore appliqués.
 */

export const APP_ROLE_PHARMACIEN = 'pharmacien'

/** Rôle texte pour l’utilisateur connecté (JWT), ou null si pas de ligne. */
export async function fetchCurrentAppRole(supabase) {
  const { data, error } = await supabase.rpc('get_current_app_role')
  return { role: data ?? null, error }
}

/** true si public.users existe pour auth.uid() et role = pharmacien */
export async function isPharmacistAppUser(supabase, userId) {
  if (!userId) return { ok: false, error: null }

  const { role, error } = await fetchCurrentAppRole(supabase)
  if (error) return { ok: false, error }
  if (!role || role !== APP_ROLE_PHARMACIEN) {
    return { ok: false, error: null }
  }
  return { ok: true, error: null }
}
