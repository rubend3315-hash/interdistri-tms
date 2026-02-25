import { base44 } from "@/api/base44Client";

/**
 * Calculate total work hours excluding break time
 */
export function calculateTotalHours(startTime, endTime, breakMinutes = 0) {
  if (!startTime || !endTime) return 0;
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
  
  // Handle overnight shifts
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  
  totalMinutes -= breakMinutes || 0;
  return Math.round(totalMinutes / 60 * 100) / 100;
}

/**
 * Calculate overtime hours
 * Default threshold is 9 hours per day for regular employees.
 * For oproepkrachten (CAO art. 10), threshold is 8 hours per day.
 */
export function calculateOvertimeHours(totalHours, maxDailyHours = 9) {
  if (totalHours > maxDailyHours) {
    return Math.round((totalHours - maxDailyHours) * 100) / 100;
  }
  return 0;
}

/**
 * Calculate night hours (22:00 - 06:00)
 * Uses a linear timeline approach to correctly handle overnight shifts.
 * The shift is mapped onto a 48-hour timeline (0-2880 minutes) so that
 * overnight crossings are handled naturally without special-case logic.
 */
export function calculateNightHours(startTime, endTime, date) {
  if (!startTime || !endTime) return 0;
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  let startMin = startH * 60 + startM;
  let endMin = endH * 60 + endM;
  
  // If end <= start, shift crosses midnight → map end to next day
  if (endMin <= startMin) {
    endMin += 1440;
  }
  
  // Night windows on the 48-hour timeline:
  // Window 1: 00:00 (0) – 06:00 (360)     (day 1 early morning)
  // Window 2: 22:00 (1320) – 30:00 (1800)  (day 1 evening → day 2 06:00)
  // Window 3: 46:00 (2760) – 54:00 (3240)  (day 2 evening, unlikely but safe)
  const nightWindows = [
    [0, 360],
    [1320, 1800],
    [2760, 3240],
  ];
  
  let nightMinutes = 0;
  for (const [wStart, wEnd] of nightWindows) {
    const overlapStart = Math.max(startMin, wStart);
    const overlapEnd = Math.min(endMin, wEnd);
    if (overlapEnd > overlapStart) {
      nightMinutes += overlapEnd - overlapStart;
    }
  }
  
  return Math.round(Math.max(0, nightMinutes) / 60 * 100) / 100;
}

/**
 * Check if date is a weekend
 */
export function isWeekend(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Calculate weekend hours
 */
export function calculateWeekendHours(date, totalHours, shiftType) {
  if (shiftType === 'Vrij' || shiftType === 'Verlof' || shiftType === 'Ziek') {
    return 0;
  }
  
  return isWeekend(date) ? totalHours : 0;
}

/**
 * Check if date is a holiday
 */
export async function isHoliday(date) {
  try {
    const holidays = await base44.entities.Holiday.list();
    const dateStr = date instanceof Date ? date.toISOString().split('T')[0] : date;
    return holidays.some(h => h.date === dateStr);
  } catch {
    return false;
  }
}

/**
 * Calculate holiday hours
 */
export async function calculateHolidayHours(date, totalHours, shiftType) {
  if (shiftType === 'Vrij' || shiftType === 'Verlof' || shiftType === 'Ziek') {
    return 0;
  }
  
  const isHolidayDate = await isHoliday(date);
  return isHolidayDate ? totalHours : 0;
}

/**
 * Calculate all hour types for a time entry
 */
export async function calculateAllHours(startTime, endTime, breakMinutes, date, shiftType) {
  const totalHours = calculateTotalHours(startTime, endTime, breakMinutes);
  const overtimeHours = calculateOvertimeHours(totalHours);
  const nightHours = calculateNightHours(startTime, endTime, date);
  const weekendHours = calculateWeekendHours(date, totalHours, shiftType);
  const holidayHours = await calculateHolidayHours(date, totalHours, shiftType);
  
  return {
    total_hours: totalHours,
    overtime_hours: overtimeHours,
    night_hours: nightHours,
    weekend_hours: weekendHours,
    holiday_hours: holidayHours
  };
}

/**
 * Validate hour calculations
 */
export function validateHourCalculations(hours) {
  const errors = [];
  
  if (hours.total_hours < 0) {
    errors.push('Totaal uren kan niet negatief zijn');
  }
  
  if (hours.overtime_hours < 0) {
    errors.push('Overuren kunnen niet negatief zijn');
  }
  
  if (hours.night_hours < 0) {
    errors.push('Nachturen kunnen niet negatief zijn');
  }
  
  if (hours.weekend_hours < 0 || hours.weekend_hours > hours.total_hours) {
    errors.push('Weekenduren moeten tussen 0 en totaal uren liggen');
  }
  
  if (hours.holiday_hours < 0 || hours.holiday_hours > hours.total_hours) {
    errors.push('Feestdaguren moeten tussen 0 en totaal uren liggen');
  }
  
  return errors;
}