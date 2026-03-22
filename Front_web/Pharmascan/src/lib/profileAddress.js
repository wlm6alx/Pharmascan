/** Extrait le numéro sans le préfixe indicatif (ex. "+237 6…" → "6…"). */
export function phoneNumberWithoutCode(fullPhone, phoneCode) {
  if (!fullPhone) return ''
  const code = (phoneCode || '+237').trim()
  const t = fullPhone.trim()
  if (t.startsWith(code)) return t.slice(code.length).trim()
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length > 1 && parts[0].startsWith('+')) return parts.slice(1).join(' ').trim()
  return t
}

/**
 * Repli : adresse construite à l’inscription comme
 * ville - nom du pays - rue - Réf: point de repère
 */
export function parseLegacyAddressLine(address) {
  if (!address || address === '—') return { city: '', street: '', reference: '' }
  const parts = address.split(' - ').map((p) => p.trim()).filter(Boolean)
  const refIdx = parts.findIndex((p) => /^Réf:\s*/i.test(p))
  const reference =
    refIdx >= 0 ? parts[refIdx].replace(/^Réf:\s*/i, '').trim() : ''
  const withoutRef = refIdx >= 0 ? parts.filter((_, i) => i !== refIdx) : parts
  const city = withoutRef[0] || ''
  const street =
    withoutRef.length >= 3 ? withoutRef[2] : withoutRef.length === 2 ? withoutRef[1] : ''
  return { city, street, reference }
}
