/** Nom exact de la table inventaire (PostgREST / cache). */
export const T_MEDICAMENT = 'medicaments'

/** Bucket Supabase Storage pour les photos de médicaments (Medications.jsx). */
export const BUCKET_MEDICATION_PHOTOS = 'medication-photos'

/**
 * Colonne « code-barres » sur public.medicaments (nom exact Postgres / cache PostgREST).
 * Erreur typique si le nom ne correspond pas : Could not find the '…' column in the schema cache
 *
 * Surcharge optionnelle : VITE_MEDICAMENT_CODE_BARRES_COL=code_barres (ou barcode, ean, etc.)
 */
export const M_COL_CODE_BARRES =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MEDICAMENT_CODE_BARRES_COL) ||
  'code_barre'

/** Lit le code-barres depuis une ligne renvoyée par Supabase (plusieurs noms possibles). */
export function medicamentBarcodeFromRow(row) {
  if (!row) return null
  const primary = row[M_COL_CODE_BARRES]
  if (primary != null && String(primary).trim() !== '') return primary
  if (row.code_barres != null && String(row.code_barres).trim() !== '') return row.code_barres
  if (row.barcode != null && String(row.barcode).trim() !== '') return row.barcode
  return null
}
