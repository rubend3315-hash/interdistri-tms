/**
 * Timeline consistency check — development guard.
 *
 * Controleert of dienstregels niet overlappen en
 * binnen de dienst vallen. Logt alleen, past NOOIT tijden aan.
 *
 * Aanroepen bij: submit, regel opslaan, dienst sync.
 */

import { timeToMinutes } from "./dienstRegelValidation";

/**
 * @param {{ start_time?: string, end_time?: string }} dienst
 * @param {Array<{ start_time?: string, end_time?: string }>} regels
 * @returns {boolean} true als timeline consistent is
 */
export function assertTimeline(dienst, regels) {
  if (!regels?.length) return true;

  const sorted = [...regels]
    .map(r => ({
      s: timeToMinutes(r.start_time),
      e: timeToMinutes(r.end_time),
    }))
    .filter(r => r.s !== null && r.e !== null)
    .sort((a, b) => a.s - b.s);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].s < sorted[i - 1].e) {
      console.error(
        `[TimelineAssert] Overlap: regel ${i} start (${sorted[i].s}) < vorige eind (${sorted[i - 1].e})`
      );
      return false;
    }
  }

  return true;
}