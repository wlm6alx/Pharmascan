/**
 * Dosages et formes galéniques — repères d’officine (saisie libre conservée en base).
 */

/** Suggestions fréquentes (mg, g, µg, UI, ml, concentrations…) */
export const DEFAULT_DOSAGE_SUGGESTIONS = [
  '2,5 mg',
  '5 mg',
  '10 mg',
  '20 mg',
  '25 mg',
  '40 mg',
  '50 mg',
  '80 mg',
  '100 mg',
  '125 mg',
  '160 mg',
  '250 mg',
  '500 mg',
  '600 mg',
  '800 mg',
  '1000 mg',
  '1 g',
  '1,5 g',
  '250 µg',
  '500 µg',
  '75 UI',
  '100 UI',
  '200 UI',
  '400 UI',
  '1000 UI',
  '5 ml',
  '10 ml',
  '15 ml',
  '20 ml',
  '100 ml',
  '200 ml',
  '2 mg/ml',
  '5 mg/ml',
  '10 mg/ml',
  '20 mg/ml',
  '0,5 mg/ml',
  '1 %',
  '2 %',
]

/**
 * Formes galéniques regroupées par voie / famille (libellés usuels en FR).
 */
export const MEDICATION_FORM_GROUPS = [
  {
    label: 'Voie orale — formes solides',
    options: [
      'Comprimé',
      'Comprimé pelliculé',
      'Comprimé dispersible',
      'Comprimé orodispersible',
      'Comprimé à libération prolongée',
      'Gélule',
      'Gélule à libération prolongée',
      'Lyophilisat oral',
      'Pastille',
    ],
  },
  {
    label: 'Voie orale — formes liquides ou semi-solides',
    options: [
      'Solution buvable',
      'Suspension buvable',
      'Sirop',
      'Gouttes buvables',
      'Poudre pour suspension buvable',
      'Émulsion buvable',
    ],
  },
  {
    label: 'Cutanée',
    options: ['Crème', 'Pommade', 'Gel', 'Lotion', 'Solution cutanée', 'Patch transdermique', 'Poudre'],
  },
  {
    label: 'Ophtalmique',
    options: ['Collyre', 'Gel ophtalmique', 'Pommade ophtalmique'],
  },
  {
    label: 'Auriculaire / nasale',
    options: ['Gouttes auriculaires', 'Spray nasal', 'Solution nasale'],
  },
  {
    label: 'Rectale / vaginale',
    options: ['Suppositoire', 'Crème rectale', 'Ovule'],
  },
  {
    label: 'Injectables',
    options: [
      'Solution injectable',
      'Suspension injectable',
      'Poudre pour solution injectable',
      'Poudre pour suspension injectable',
    ],
  },
  {
    label: 'Inhalation',
    options: ['Suspension pour inhalation', 'Poudre pour inhalation', 'Aérosol', 'Solution pour nébulisation'],
  },
]

const FORM_OTHER = '__custom__'

export function flattenFormOptions() {
  return MEDICATION_FORM_GROUPS.flatMap((g) => g.options)
}

/**
 * Associe une valeur enregistrée à une option de la liste (tolérance de casse / accents faible).
 * `extraForms` = formes déjà vues dans l’inventaire (hors liste standard).
 * Retourne l’option canonique, ou FORM_OTHER si saisie libre.
 */
export function matchStoredFormToOption(stored, extraForms = []) {
  const flat = flattenFormOptions()
  if (!stored || !String(stored).trim()) return ''
  const t = String(stored).trim()
  const exact = flat.find((o) => o === t)
  if (exact) return exact
  const ci = flat.find((o) => o.localeCompare(t, 'fr', { sensitivity: 'accent' }) === 0)
  if (ci) return ci
  const lower = flat.find((o) => o.toLowerCase() === t.toLowerCase())
  if (lower) return lower
  const ex = extraForms.find(
    (o) => o === t || o.localeCompare(t, 'fr', { sensitivity: 'accent' }) === 0
  )
  if (ex) return ex
  return FORM_OTHER
}

export function isCustomFormOption(value) {
  return value === FORM_OTHER
}

export const CUSTOM_FORM_VALUE = FORM_OTHER

/**
 * @param {Array<{ dosage?: string }>} medications
 */
export function mergeDosageSuggestions(medications) {
  const set = new Set(DEFAULT_DOSAGE_SUGGESTIONS)
  ;(medications || []).forEach((m) => {
    const d = m?.dosage && String(m.dosage).trim()
    if (d && d.length <= 48) set.add(d)
  })
  return [...set].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
}

/**
 * Formes déjà présentes en inventaire mais absentes de la liste standard.
 * @param {Array<{ form?: string }>} medications
 */
export function mergeExtraFormLabels(medications) {
  const flat = flattenFormOptions()
  const extras = new Set()
  ;(medications || []).forEach((m) => {
    const f = m?.form && String(m.form).trim()
    if (!f) return
    const known = flat.some((o) => o.localeCompare(f, 'fr', { sensitivity: 'accent' }) === 0)
    if (!known) extras.add(f)
  })
  return [...extras].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
}
