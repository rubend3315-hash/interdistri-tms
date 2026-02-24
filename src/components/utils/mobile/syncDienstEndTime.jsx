/**
 * syncDienstEndTime — PostNL service-logica.
 *
 * ENIGE plek waar dienst-sync offset wordt toegepast (via TimePolicy).
 * Reden: administratieve afronding tussen rit-einde en dienst-afmelding.
 *
 * Gebruik ALLEEN bij:
 * - afsluiten van een open rit (DienstRegelDrawer → onCloseOpenRitToDienst)
 * - afsluiten van een standplaats (idem)
 *
 * NIET gebruiken bij:
 * - autorit generatie (+1 min is aparte regel in generateAutoRit)
 * - toggle PostNL
 * - drawer openen
 * - overlap check
 * - prefill starttijd
 * - submit normalisatie
 * - backend mapping
 */

import { applyDienstSyncOffset, formatMinutes } from "./timePolicy";

/**
 * Bereken dienst eindtijd op basis van de laatst afgesloten regel + offset.
 *
 * @param {string} ritEndTime - Eindtijd van de afgesloten regel (HH:MM)
 * @returns {string|null} - Nieuwe dienst eindtijd (HH:MM) of null bij ongeldige invoer
 */
export function calcDienstEndFromRit(ritEndTime) {
  if (!ritEndTime || ritEndTime.length < 5) return null;

  const [h, m] = ritEndTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  return formatMinutes(applyDienstSyncOffset(h * 60 + m));
}