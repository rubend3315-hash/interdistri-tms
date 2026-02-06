/**
 * Bepaalt automatisch het shift type op basis van starttijd.
 * - Nachtdienst: starttijd tussen 21:00 en 04:59
 * - Avond: starttijd tussen 18:00 en 20:59
 * - Dag: starttijd tussen 05:00 en 17:59
 */
export function determineShiftType(startTime) {
  if (!startTime || !startTime.includes(':')) return "Dag";
  
  const [hours] = startTime.split(':').map(Number);
  
  if (hours >= 21 || hours < 5) {
    return "Nachtdienst";
  } else if (hours >= 16) {
    return "Avond";
  } else {
    return "Dag";
  }
}