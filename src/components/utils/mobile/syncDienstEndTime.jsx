/**
 * syncDienstEndTime — PostNL service-logica.
 *
 * ENIGE plek waar +2 minuten wordt toegepast.
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

const DIENST_END_OFFSET_MINUTES = 2;

/**
 * Bereken dienst eindtijd op basis van de laatst afgesloten regel + 2 minuten.
 *
 * @param {string} ritEndTime - Eindtijd van de afgesloten regel (HH:MM)
 * @returns {string|null} - Nieuwe dienst eindtijd (HH:MM) of null bij ongeldige invoer
 */
export function calcDienstEndFromRit(ritEndTime) {
  if (!ritEndTime || ritEndTime.length < 5) return null;

  const [h, m] = ritEndTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;

  const total = h * 60 + m + DIENST_END_OFFSET_MINUTES;
  const eH = Math.floor(total / 60) % 24;
  const eM = total % 60;

  return `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
}