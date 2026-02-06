/**
 * Bepaalt automatisch het shift type op basis van starttijd.
 * - Nachtdienst: starttijd tussen 21:00 en 04:59
 * - Avond: starttijd tussen 18:00 en 20:59
 * - Dag: starttijd tussen 05:00 en 17:59
 */
export function determineShiftType(startTime, endTime) {
  if (!startTime || !startTime.includes(':')) return "Dag";
  
  const [startHours] = startTime.split(':').map(Number);
  
  if (startHours >= 21 || startHours < 5) {
    return "Nachtdienst";
  } else if (startHours >= 16) {
    // Avonddienst, maar als eindtijd na 21:00 → Nachtdienst
    if (endTime && endTime.includes(':')) {
      const [endHours] = endTime.split(':').map(Number);
      if (endHours >= 21 || endHours < 5) {
        return "Nachtdienst";
      }
    }
    return "Avond";
  } else {
    return "Dag";
  }
}