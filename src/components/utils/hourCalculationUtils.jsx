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
 * Calculate overtime hours (anything above 9 hours per day)
 */
export function calculateOvertimeHours(totalHours, maxDailyHours = 9) {
  if (totalHours > maxDailyHours) {
    return Math.round((totalHours - maxDailyHours) * 100) / 100;
  }
  return 0;
}

/**
 * Calculate night hours (22:00 - 06:00)
 */
export function calculateNightHours(startTime, endTime, date) {
  if (!startTime || !endTime) return 0;
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  const nightStart = 22 * 60; // 22:00
  const nightEnd = 6 * 60;   // 06:00
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  let nightMinutes = 0;
  
  // Handle overnight shifts
  if (endMinutes < startMinutes) {
    // Shift crosses midnight
    // Night hours from start to end of day
    if (startMinutes < nightStart) {
      nightMinutes += (24 * 60 - startMinutes) - (24 * 60 - nightStart);
    } else {
      nightMinutes += 24 * 60 - startMinutes;
    }
    // Night hours from start of day to end
    nightMinutes += endMinutes - nightEnd;
  } else {
    // Same day shift
    // Check if shift overlaps with night hours
    if (startMinutes < nightEnd) {
      // Starts before 06:00
      if (endMinutes <= nightEnd) {
        nightMinutes = endMinutes - startMinutes;
      } else {
        nightMinutes = nightEnd - startMinutes;
      }
    }
    if (startMinutes < nightStart && endMinutes > nightStart) {
      // Ends after 22:00
      nightMinutes += endMinutes - nightStart;
    } else if (startMinutes >= nightStart) {
      nightMinutes = endMinutes - startMinutes;
    }
  }
  
  // Convert to hours and round
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
  
  if (hours.night_hours < 0 || hours.night_hours > hours.total_hours) {
    errors.push('Nachturen moeten tussen 0 en totaal uren liggen');
  }
  
  if (hours.weekend_hours < 0 || hours.weekend_hours > hours.total_hours) {
    errors.push('Weekenduren moeten tussen 0 en totaal uren liggen');
  }
  
  if (hours.holiday_hours < 0 || hours.holiday_hours > hours.total_hours) {
    errors.push('Feestdaguren moeten tussen 0 en totaal uren liggen');
  }
  
  return errors;
}