/**
 * Calculate subsistence allowance for a trip based on CAO rules.
 * @param {string} departureTime - HH:MM
 * @param {string} arrivalTime - HH:MM
 * @param {string} tripDate - YYYY-MM-DD
 * @param {Array} caoRules - Active CAO rules for Verblijfkosten
 * @returns {number} Calculated allowance
 */
export function calculateSubsistenceAllowance(departureTime, arrivalTime, tripDate, caoRules) {
  if (!departureTime || !arrivalTime) return 0;
  if (!Array.isArray(caoRules) || caoRules.length === 0) return 0;

  const [depH, depM] = departureTime.split(':').map(Number);
  const [arrH, arrM] = arrivalTime.split(':').map(Number);
  let totalMinutes = (arrH * 60 + arrM) - (depH * 60 + depM);
  const spansNextDay = totalMinutes < 0;
  if (spansNextDay) totalMinutes += 24 * 60;
  const tripHours = totalMinutes / 60;

  if (tripHours <= 4) return 0;

  const depMinutes = depH * 60 + depM;
  const arrMinutes = arrH * 60 + arrM;
  const departsBefore14 = depMinutes < 14 * 60;

  const applicableRules = caoRules.filter(rule => {
    if (!rule || rule.status !== 'Actief') return false;
    if (rule.start_date && new Date(tripDate) < new Date(rule.start_date)) return false;
    if (rule.end_date && new Date(tripDate) > new Date(rule.end_date)) return false;

    const nameLower = (rule.name || '').toLowerCase();
    return nameLower.includes('verblijfskosten') && nameLower.includes('ééndaagse');
  });

  if (applicableRules.length === 0) return 0;

  let totalAllowance = 0;

  if (departsBefore14) {
    const basisRule = applicableRules.find(r => !r.start_time && !r.end_time);

    if (basisRule) {
      const basisRate = basisRule.value || 0;
      totalAllowance = tripHours * basisRate;

      const timeRules = applicableRules.filter(r => r.start_time && r.end_time);
      for (const rule of timeRules) {
        const [startH, startM] = rule.start_time.split(':').map(Number);
        const [endH, endM] = rule.end_time.split(':').map(Number);
        const ruleStartMinutes = startH * 60 + startM;
        const ruleEndMinutes = endH * 60 + endM;
        const ruleRate = rule.value || 0;

        let ruleHours = 0;

        if (spansNextDay) {
          if (depMinutes < 24 * 60) {
            const overlapStart = Math.max(depMinutes, ruleStartMinutes);
            const overlapEnd = Math.min(24 * 60, ruleEndMinutes);
            if (overlapEnd > overlapStart) {
              ruleHours += (overlapEnd - overlapStart) / 60;
            }
          }
          if (arrMinutes > 0) {
            const overlapStart = Math.max(0, ruleStartMinutes);
            const overlapEnd = Math.min(arrMinutes, ruleEndMinutes);
            if (overlapEnd > overlapStart) {
              ruleHours += (overlapEnd - overlapStart) / 60;
            }
          }
        } else {
          const overlapStart = Math.max(depMinutes, ruleStartMinutes);
          const overlapEnd = Math.min(depMinutes + totalMinutes, ruleEndMinutes);
          if (overlapEnd > overlapStart) {
            ruleHours = (overlapEnd - overlapStart) / 60;
          }
        }

        totalAllowance -= ruleHours * basisRate;
        totalAllowance += ruleHours * ruleRate;
      }
    }
  }

  // Extra toeslag for 12+ hour trips
  if (tripHours >= 12) {
    const toeslagRule = applicableRules.find(r => {
      const nameLower = (r.name || '').toLowerCase();
      const descLower = (r.description || '').toLowerCase();
      return (nameLower.includes('toeslag') || descLower.includes('toeslag')) &&
        (descLower.includes('12 uur') || descLower.includes('12uur'));
    });

    if (toeslagRule) {
      totalAllowance += toeslagRule.value || toeslagRule.fixed_amount || 0;
    }
  }

  return totalAllowance;
}