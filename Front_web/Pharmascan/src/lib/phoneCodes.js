import { Country } from 'country-state-city'

/**
 * Formate le phonecode du package (souvent "374" ou "+358-18") en indicatif affichable.
 */
export function normalizeDialCode(phonecode) {
  if (phonecode == null || phonecode === '') return '+237'
  const s = String(phonecode).trim()
  if (s.startsWith('+')) return s
  return `+${s}`
}

// Surcharges / secours si une entrée manque dans country-state-city (rare)
export const phoneCodes = {
  CM: { code: '+237', flag: '🇨🇲', name: 'Cameroun' },
}

/**
 * Indicatif + drapeau + nom pour un code pays ISO (ex. AM, CM).
 * S’appuie sur `country-state-city` pour couvrir tous les pays du sélecteur.
 */
export const getPhoneCode = (countryIsoCode) => {
  const fallback = phoneCodes.CM
  if (!countryIsoCode) return fallback

  const country = Country.getCountryByCode(countryIsoCode)
  if (
    country &&
    country.phonecode !== undefined &&
    country.phonecode !== null &&
    String(country.phonecode).trim() !== ''
  ) {
    return {
      code: normalizeDialCode(country.phonecode),
      flag: country.flag || '🏳️',
      name: country.name,
    }
  }

  return phoneCodes[countryIsoCode] || fallback
}

export const getPhoneCodesList = () =>
  Country.getAllCountries()
    .map((c) => ({
      countryCode: c.isoCode,
      phoneCode: normalizeDialCode(c.phonecode),
      flag: c.flag,
      name: c.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
