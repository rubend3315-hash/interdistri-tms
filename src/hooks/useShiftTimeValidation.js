import { normalizeTime, timeToMinutes } from '@/lib/timeUtils';

/**
 * Reusable hook for shift-time deviation validation.
 * Pure logic — no UI, no side effects.
 *
 * @param {Object} params
 * @param {string} params.enteredStartTime - The time entered by the user (HH:MM or ISO string)
 * @param {string} params.shiftStartTime  - The planned shift start time
 * @param {number} [params.tolerance=5]   - Minutes of acceptable deviation
 * @returns {{ isWarning: boolean, diff: number, normalizedEntered: string|null, normalizedShift: string|null }}
 */
export function useShiftTimeValidation({
  enteredStartTime,
  shiftStartTime,
  tolerance = 5
}) {
  const normalizedEntered = normalizeTime(enteredStartTime);
  const normalizedShift = normalizeTime(shiftStartTime);

  let diff = 0;
  let isWarning = false;

  if (normalizedEntered && normalizedShift) {
    const enteredMin = timeToMinutes(normalizedEntered);
    const shiftMin = timeToMinutes(normalizedShift);

    if (enteredMin !== null && shiftMin !== null) {
      diff = Math.abs(enteredMin - shiftMin);
      isWarning = diff >= tolerance;
    }
  }

  return {
    isWarning,
    diff,
    normalizedEntered,
    normalizedShift
  };
}