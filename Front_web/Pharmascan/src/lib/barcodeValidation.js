/**
 * Normalise un code-barres : chiffres uniquement (EAN/GTIN).
 * NFKC : les chiffres « pleine largeur » (PDF, copie depuis certains sites) deviennent des 0-9 ASCII.
 */
export function normalizeBarcodeDigits(barcode) {
  if (barcode == null || barcode === '') return ''
  const s = String(barcode).normalize('NFKC')
  return s.replace(/\D/g, '')
}

/** Modulo 10 GS1 sur une chaîne de chiffres uniquement (longueur ≥ 2, dernier = clé). */
function checksumMod10Gtin(d) {
  if (d.length < 2) return false
  let sum = 0
  for (let i = d.length - 2; i >= 0; i--) {
    const digit = parseInt(d[i], 10)
    if (Number.isNaN(digit)) return false
    const posFromRight = d.length - 1 - i
    sum += digit * (posFromRight % 2 === 1 ? 3 : 1)
  }
  const check = (10 - (sum % 10)) % 10
  return check === parseInt(d[d.length - 1], 10)
}

/**
 * Clé de contrôle GS1 (GTIN-8, UPC-12, EAN-13, GTIN-14).
 * Repli : 12 chiffres invalides en UPC → réessai comme EAN-13 « 0 » + UPC (zéro initial souvent omis).
 * @see https://www.gs1.org/services/check-digit-calculator
 */
export function isValidGtinChecksum(input) {
  const d = normalizeBarcodeDigits(input)
  if (d.length < 2) return false
  if (![8, 12, 13, 14].includes(d.length)) return false
  if (checksumMod10Gtin(d)) return true
  if (d.length === 12 && checksumMod10Gtin(`0${d}`)) return true
  return false
}

/**
 * GTIN « strict » : longueurs 8, 12, 13 ou 14 avec clé GS1 valide.
 */
export function isValidGtin(barcode) {
  const d = normalizeBarcodeDigits(barcode)
  if (d.length === 0) return true
  if (![8, 12, 13, 14].includes(d.length)) return false
  return isValidGtinChecksum(d)
}

function isGtinLength(len) {
  return [8, 12, 13, 14].includes(len)
}

/**
 * Saisie autorisée pour la base : vide, ou 4 à 14 chiffres (codes internes, CIP, GTIN, etc.).
 * La clé GS1 n’est pas obligatoire pour les longueurs GTIN (trop de codes réels / historiques hors norme).
 */
export function isValidBarcodeEntry(barcode) {
  const d = normalizeBarcodeDigits(barcode)
  if (d.length === 0) return true
  if (d.length < 4 || d.length > 14) return false
  return true
}

/** Longueur GTIN (8, 12, 13, 14) mais clé GS1 incorrecte — afficher un avertissement facultatif. */
export function shouldWarnGtinChecksum(barcode) {
  const d = normalizeBarcodeDigits(barcode)
  if (!isGtinLength(d.length)) return false
  return !isValidGtinChecksum(d)
}

function sameProductIdentity(m, form) {
  const norm = (s) => (s ?? '').toString().trim().toLowerCase()
  return (
    norm(m.name) === norm(form.name) &&
    norm(m.manufacturer) === norm(form.manufacturer) &&
    norm(m.category) === norm(form.category)
  )
}

/**
 * Retourne un médicament existant qui entre en conflit : même code-barres
 * pour un produit différent (nom, fabricant ou catégorie différente).
 */
export function findBarcodeConflict(medications, barcode, formData, excludeId) {
  const n = normalizeBarcodeDigits(barcode)
  if (!n) return null
  return (
    medications.find((m) => {
      if (excludeId != null && String(m.id) === String(excludeId)) return false
      if (normalizeBarcodeDigits(m.barcode) !== n) return false
      return !sameProductIdentity(m, formData)
    }) || null
  )
}
