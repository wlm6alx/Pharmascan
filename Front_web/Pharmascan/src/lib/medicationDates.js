/**
 * Dates pharmacie : saisie mois/année.
 * - Expiration : stockage fin de mois (valable jusqu’à la fin du mois).
 * - Production : stockage 1er jour du mois (lot fabriqué durant ce mois).
 */

/** Parse YYYY-MM-DD en date locale (évite le décalage UTC de `new Date('YYYY-MM-DD')`). */
export function parseLocalDateFromIso(iso) {
  if (!iso || typeof iso !== 'string') return null
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** YYYY-MM-DD → valeur pour <input type="month" /> */
export function isoDateToMonthYearInput(iso) {
  if (!iso || typeof iso !== 'string') return ''
  const m = iso.match(/^(\d{4})-(\d{2})/)
  return m ? `${m[1]}-${m[2]}` : ''
}

/** YYYY-MM (saisie) → dernier jour du mois en YYYY-MM-DD */
export function monthYearToExpirationIso(yyyyMm) {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return null
  const y = Number(yyyyMm.slice(0, 4), 10)
  const mo = Number(yyyyMm.slice(5, 7), 10)
  if (mo < 1 || mo > 12 || !Number.isFinite(y)) return null
  const last = new Date(y, mo, 0)
  const yy = last.getFullYear()
  const mm = String(last.getMonth() + 1).padStart(2, '0')
  const dd = String(last.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/** YYYY-MM (saisie) → 1er jour du mois en YYYY-MM-DD */
export function monthYearToProductionIso(yyyyMm) {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return null
  const y = Number(yyyyMm.slice(0, 4), 10)
  const mo = Number(yyyyMm.slice(5, 7), 10)
  if (mo < 1 || mo > 12 || !Number.isFinite(y)) return null
  const mm = String(mo).padStart(2, '0')
  return `${y}-${mm}-01`
}

/** Affichage court : mois / année (ex. 03/2026) */
export function formatExpirationMonthYear(iso) {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})/)
  if (!m) return ''
  const d = new Date(Number(m[1], 10), Number(m[2], 10) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })
}

/** Médicament expiré : fin de mois d'expiration strictement avant aujourd'hui (local). */
export function isMedicationExpired(m) {
  if (!m?.expiration_date) return false
  const exp = parseLocalDateFromIso(m.expiration_date)
  if (!exp) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  exp.setHours(0, 0, 0, 0)
  return exp < today
}

/** Pour tri : timestamp fin de journée locale de la date d'expiration */
export function expirationDateSortKey(iso) {
  const d = parseLocalDateFromIso(iso)
  return d ? d.getTime() : 0
}
