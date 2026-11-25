export const TUNISIAN_GOVERNORATES = [
  'Ariana', 'Béja', 'Ben Arous', 'Bizerte', 'Gabès', 'Gafsa', 'Jendouba', 'Kairouan',
  'Kasserine', 'Kébili', 'Le Kef', 'Mahdia', 'La Manouba', 'Médenine', 'Monastir', 'Nabeul',
  'Sfax', 'Sidi Bouzid', 'Siliana', 'Sousse', 'Tataouine', 'Tozeur', 'Tunis', 'Zaghouan',
]

/**
 * Normalise a Tunisian phone number to the backend format
 * (+216XXXXXXXX or XXXXXXXX). Returns '' when it cannot be normalised.
 */
export function normalizeTunisianPhone(value) {
  const compact = String(value || '').replace(/[\s().-]/g, '')
  const withPlus = compact.startsWith('00216') ? `+216${compact.slice(5)}` : compact
  if (/^\+216\d{8}$/.test(withPlus) || /^\d{8}$/.test(withPlus)) return withPlus
  if (/^216\d{8}$/.test(withPlus)) return `+${withPlus}`
  return ''
}
