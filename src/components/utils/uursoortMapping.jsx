/**
 * Centrale uursoort-mappinglaag.
 *
 * De loonengine retourneert technische componentnamen (basis_100, overwerk_130, etc.).
 * Deze laag vertaalt die naar configureerbare uursoortcodes (GEW100, OW130, DZA150, etc.).
 *
 * ARCHITECTUUR:
 *   Loonengine (berekening) → Mappinglaag (vertaling) → Export/Rapportage (gebruikt gemapte codes)
 *
 * De mapping wordt opgehaald uit PayrollSettings.looncomponent_uursoort_mapping.
 * Als een mapping ontbreekt, wordt een expliciete fout gegooid — GEEN stille fallback.
 */

/**
 * Standaard mapping — wordt gebruikt als initiële waarden bij configuratie.
 * Wordt NIET als fallback gebruikt bij export/rapportage.
 */
export const DEFAULT_UURSOORT_MAPPING = {
  basis_100: "GEW100",
  overwerk_130: "OW130",
  diensturen_zaterdag_150: "DZA150",
  toeslag_za_50: "TDZA50",
  overwerk_zaterdag_150: "ZOW150",
  diensturen_zondag_200: "DZO200",
  toeslag_zo_100: "TDZO100",
  overwerk_zondag_200: "ZOO200",
  diensturen_feestdag_200: "DFD200",
  toeslag_feestdag_100: "TFD100",
  feestdag_overwerk_200: "FOW200",
  toeslagenmatrix_19: "TM19",
  nachturen: "NACHT",
  variabele_uren_100: "VAR100",
  compensatie_uren: "COMP",
  aanvulling_contract: "AANV",
  verlof: "VERL",
  ziek: "ZIEK",
  atv: "ATV",
  feestdag: "FEEST",
  bijzonder_verlof: "BVERL",
  partner_verlof: "PVERL",
  onbetaald_verlof: "OBVERL",
  ouderschapsverlof_betaald: "OSVB",
  ouderschapsverlof_onbetaald: "OSVO",
  partnerverlof_week: "PVWK",
  verblijfkosten: "VERB",
};

/**
 * Alle looncomponenten met hun beschrijvingen (voor UI).
 */
export const LOONCOMPONENT_BESCHRIJVINGEN = {
  basis_100: "Basis 100%",
  overwerk_130: "Overwerk 130%",
  diensturen_zaterdag_150: "Diensturen zaterdag 150%",
  toeslag_za_50: "Toeslag diensturen zaterdag 50%",
  overwerk_zaterdag_150: "Overwerk zaterdag 150%",
  diensturen_zondag_200: "Diensturen zondag 200%",
  toeslag_zo_100: "Toeslag diensturen zondag 100%",
  overwerk_zondag_200: "Overwerk zondag 200%",
  diensturen_feestdag_200: "Diensturen feestdag 200%",
  toeslag_feestdag_100: "Toeslag feestdag 100%",
  feestdag_overwerk_200: "Feestdag overwerk 200%",
  toeslagenmatrix_19: "Toeslagenmatrix 19%",
  nachturen: "Nachturen",
  variabele_uren_100: "Variabele uren 100%",
  compensatie_uren: "Compensatie-uren",
  aanvulling_contract: "Aanvulling contracturen",
  verlof: "Verlof",
  ziek: "Ziek",
  atv: "ATV",
  feestdag: "Feestdag",
  bijzonder_verlof: "Bijzonder verlof",
  partner_verlof: "Partner verlof",
  onbetaald_verlof: "Onbetaald verlof",
  ouderschapsverlof_betaald: "Ouderschapsverlof (betaald 70%)",
  ouderschapsverlof_onbetaald: "Ouderschapsverlof (onbetaald)",
  partnerverlof_week: "Partnerverlof",
  verblijfkosten: "Verblijfkosten",
};

/**
 * Haal de uursoortcode op voor een looncomponent.
 * Gooit een fout als de mapping ontbreekt (geen stille fallback).
 *
 * @param {object} mapping - De mapping uit PayrollSettings.looncomponent_uursoort_mapping
 * @param {string} componentKey - De technische looncomponent key (bijv. "overwerk_130")
 * @returns {string} De uursoortcode (bijv. "OW130")
 */
export function getUursoortCode(mapping, componentKey) {
  if (!mapping || typeof mapping !== "object") {
    throw new Error(`Uursoort-mapping is niet geconfigureerd. Configureer de mapping in HRM Instellingen → Payroll.`);
  }
  const code = mapping[componentKey];
  if (!code) {
    throw new Error(`Uursoort-mapping ontbreekt voor looncomponent "${componentKey}". Configureer deze in HRM Instellingen → Payroll.`);
  }
  return code;
}

/**
 * Vertaal een compleet loonresultaat (uit calculateWeekData) naar uursoortcodes.
 * Retourneert een object met uursoortcodes als keys en uren als values.
 * Alleen componenten met waarde > 0 worden opgenomen.
 *
 * @param {object} mapping - De mapping uit PayrollSettings
 * @param {object} weekData - Het resultaat van calculateWeekData
 * @returns {object} { [uursoortCode]: uren }
 */
export function mapToUursoorten(mapping, weekData) {
  if (!mapping || typeof mapping !== "object") {
    throw new Error(`Uursoort-mapping is niet geconfigureerd. Configureer de mapping in HRM Instellingen → Payroll.`);
  }

  const result = {};
  const mappableKeys = Object.keys(DEFAULT_UURSOORT_MAPPING);

  for (const key of mappableKeys) {
    // Map looncomponent keys to weekData keys
    const dataKey = key === "nachturen" ? null : key; // nachturen is niet direct in weekData
    const value = dataKey ? (weekData[dataKey] || 0) : 0;
    
    if (value === 0) continue;

    const code = mapping[key];
    if (!code) {
      throw new Error(`Uursoort-mapping ontbreekt voor looncomponent "${key}" (waarde: ${value}). Configureer deze in HRM Instellingen → Payroll.`);
    }

    result[code] = (result[code] || 0) + value;
  }

  return result;
}

/**
 * Geeft het label voor een looncomponent, inclusief de uursoortcode als de mapping beschikbaar is.
 * Gebruikt in rapportage-UI om labels te tonen als "Overwerk 130% (OW130)".
 *
 * @param {string} componentKey - De technische looncomponent key
 * @param {object|null} mapping - De mapping (optioneel)
 * @returns {string} Het label, eventueel met uursoortcode
 */
export function getLooncomponentLabel(componentKey, mapping) {
  const beschrijving = LOONCOMPONENT_BESCHRIJVINGEN[componentKey] || componentKey;
  if (mapping && mapping[componentKey]) {
    return `${beschrijving} (${mapping[componentKey]})`;
  }
  return beschrijving;
}

/**
 * Valideer dat alle vereiste looncomponenten in de mapping zijn geconfigureerd.
 * Retourneert een array van ontbrekende keys.
 *
 * @param {object} mapping - De mapping uit PayrollSettings
 * @returns {string[]} Lijst van ontbrekende looncomponent keys
 */
export function validateMapping(mapping) {
  if (!mapping || typeof mapping !== "object") {
    return Object.keys(DEFAULT_UURSOORT_MAPPING);
  }
  return Object.keys(DEFAULT_UURSOORT_MAPPING).filter(key => !mapping[key]);
}