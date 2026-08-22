/**
 * S1 — Student identity normalization for MATCHING only
 * NEVER modifies canonical display values
 */

/**
 * Normalizes a string for comparison purposes.
 * Handles: multiple spaces, case, unicode NFC/NFD,
 * apostrophe variants (' vs '), dash variants (-, –, —),
 * spaces around dashes.
 */
export function normalizeForMatching(input: string): string {
  return input
    .normalize('NFC')
    .replace(/’/g, "'")
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/\s*-\s*/g, '-')
    .trim()
    .replace(/\s{2,}/g, ' ')
    .toLowerCase();
}

/**
 * Creates a matching key from lastName + firstName
 */
export function createMatchingKey(lastName: string, firstName: string): string {
  return `${normalizeForMatching(lastName)}|${normalizeForMatching(firstName)}`;
}

export type DuplicateCategory =
  | 'EXACT_DUPLICATE'
  | 'HUMAN_CONFIRMED_DUPLICATE'
  | 'PROBABLE_DUPLICATE'
  | 'DISTINCT';

/**
 * BROU human resolution — all variants map to ONE canonical student
 */
export const BROU_CANONICAL = {
  lastName: 'BROU Nétro',
  firstName: 'Marie–Gabryelle Odélia',
} as const;

/**
 * Detects BROU variants from raw source data
 */
export function isBrouVariant(lastName: string, firstName: string): boolean {
  const ln = normalizeForMatching(lastName);
  const fn = normalizeForMatching(firstName);

  // Match: "BROU" + any variant of "Marie-Gabrielle Odélia"
  if (ln === 'brou' && fn.includes('marie-gabrielle') && fn.includes('od\u00e9lia')) return true;

  // Match: "BROU Nétro" + any variant of "Marie Gabryelle Odélia"
  // Note: space is preserved in normalization, so "BROU Nétro" → "brou nétro"
  if (
    ln.startsWith('brou') &&
    (ln.includes('netro') || ln.includes('nétro')) &&
    fn.includes('marie') &&
    fn.includes('gabryelle')
  ) return true;

  return false;
}
