/**
 * CANONICAL VALIDATION SOURCE — v27
 *
 * Frontend en backend mogen NIET afwijken van deze logica.
 * Backend heeft een identieke inline kopie in submitTimeEntry.js.
 *
 * Wijzigingen hier MOETEN ook in de backend worden doorgevoerd.
 */

export function validateTimeEntryCore({
  trips = [],
  standplaatsen = [],
  geenRit = false,
  reden = '',
}) {
  const errors = [];

  const hasTrips = Array.isArray(trips) && trips.length > 0;
  const hasStandplaatsen = Array.isArray(standplaatsen) && standplaatsen.length > 0;
  const hasGeenRit = geenRit && typeof reden === 'string' && reden.trim().length >= 5;

  if (!hasTrips && !hasStandplaatsen && !hasGeenRit) {
    errors.push('Minimaal één dienstregel vereist');
  }

  return errors;
}