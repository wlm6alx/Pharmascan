/**
 * Catégories suggérées (FR) — fusionnées avec les catégories déjà utilisées par la pharmacie.
 */
export const DEFAULT_MEDICATION_CATEGORIES = [
  'Analgésiques',
  'Anti-inflammatoires non stéroïdiens',
  'Antibiotiques',
  'Antiviraux',
  'Antifongiques',
  'Antihistaminiques',
  'Antiparasitaires',
  'Cardiovasculaire',
  'Digestif et gastro-entérologie',
  'Dermatologie',
  'Ophtalmologie',
  'ORL',
  'Gynécologie',
  'Pneumologie',
  'Neurologie',
  'Psychiatrie',
  'Endocrinologie',
  'Vitamines et minéraux',
  'Homéopathie',
  'Hygiène et soins',
  'Autre',
]

/**
 * @param {Array<{ category?: string }>} medications
 */
export function mergeCategorySuggestions(medications) {
  const set = new Set(
    DEFAULT_MEDICATION_CATEGORIES.map((c) => c.trim()).filter(Boolean)
  )
  ;(medications || []).forEach((m) => {
    const c = m?.category && String(m.category).trim()
    if (c) set.add(c)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
}
