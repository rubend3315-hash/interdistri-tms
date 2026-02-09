import { getDefaultPeriodes } from "@/components/salary/LoonperiodeConfig";
import { getWeek } from "date-fns";

/**
 * Bepaal welke loonperiode een weeknummer bevat
 */
export function getPeriodeForWeek(weekNr, periodes) {
  const p = (periodes || getDefaultPeriodes()).find(p => p.weken.includes(weekNr));
  return p || null;
}

/**
 * Bepaal welke loonperiode een datum bevat
 */
export function getPeriodeForDate(date, periodes) {
  const d = new Date(date);
  const weekNr = getWeek(d, { weekStartsOn: 1 });
  return getPeriodeForWeek(weekNr, periodes);
}

/**
 * Check of een specifiek jaar+periode definitief is
 */
export function isPeriodeDefinitief(year, periodeNr, loonperiodeStatuses) {
  if (!loonperiodeStatuses || !Array.isArray(loonperiodeStatuses)) return false;
  return loonperiodeStatuses.some(
    s => s.year === year && s.periode === periodeNr && s.status === "Definitief"
  );
}

/**
 * Check of een datum in een definitieve periode valt
 */
export function isDateInDefinitiefPeriode(date, year, loonperiodeStatuses, periodes) {
  const periode = getPeriodeForDate(date, periodes);
  if (!periode) return false;
  return isPeriodeDefinitief(year, periode.periode, loonperiodeStatuses);
}

/**
 * Check of een weeknummer in een definitieve periode valt
 */
export function isWeekInDefinitiefPeriode(weekNr, year, loonperiodeStatuses, periodes) {
  const periode = getPeriodeForWeek(weekNr, periodes);
  if (!periode) return false;
  return isPeriodeDefinitief(year, periode.periode, loonperiodeStatuses);
}