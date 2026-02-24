/*
 * TIME RESPONSIBILITIES — Centrale tijdpolicy voor Mobile Entry
 *
 * +1 minuut  → Alleen PostNL eerste autorit (generateAutoRit)
 * +2 minuten → Alleen dienst-eindtijd sync (calcDienstEndFromRit)
 * 5 minuten  → Alleen validatiecontrole (dienstRegelValidation)
 *
 * NOOIT:
 * - offset toepassen in overlap checks
 * - offset toepassen in prefill helpers
 * - offset toepassen in submit normalisatie
 * - offset toepassen in backend mapping
 */

export const TimePolicy = Object.freeze({
  POSTNL_OFFSET_MIN: 1,
  DIENST_SYNC_OFFSET_MIN: 2,
  VALIDATION_MARGIN_MIN: 5,
});

/**
 * PostNL autorit: dienst.start + 1 min
 * @param {number} startMin - dienststarttijd in minuten
 * @returns {number}
 */
export function applyPostnlOffset(startMin) {
  return startMin + TimePolicy.POSTNL_OFFSET_MIN;
}

/**
 * Dienst sync: laatste regel.eind + 2 min
 * @param {number} endMin - eindtijd laatste regel in minuten
 * @returns {number}
 */
export function applyDienstSyncOffset(endMin) {
  return endMin + TimePolicy.DIENST_SYNC_OFFSET_MIN;
}

/**
 * Validatie: verschil binnen marge?
 * @param {number} diffMin - verschil in minuten
 * @returns {boolean}
 */
export function isWithinMargin(diffMin) {
  return diffMin <= TimePolicy.VALIDATION_MARGIN_MIN;
}

/**
 * Format minuten naar HH:MM
 * @param {number} totalMin
 * @returns {string}
 */
export function formatMinutes(totalMin) {
  const m = ((totalMin % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}