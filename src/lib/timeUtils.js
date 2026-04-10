/**
 * Shared time utility functions.
 * Single source of truth for time normalization and conversion.
 */

export function formatDate(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatUTC(date) {
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

export function normalizeTime(time) {
  if (!time) return null;

  if (typeof time === 'string') {
    if (time.includes('T')) {
      const isUTC = time.endsWith('Z');
      const date = new Date(time);
      if (isNaN(date)) return null;
      return isUTC ? formatUTC(date) : formatDate(date);
    }

    const parts = time.split(':');
    if (parts.length >= 2) {
      const hours = String(parts[0]).padStart(2, '0');
      const minutes = String(parts[1]).padStart(2, '0');
      return `${hours}:${minutes}`;
    }

    return null;
  }

  const date = new Date(time);
  if (isNaN(date)) return null;

  return formatDate(date);
}

export function timeToMinutes(time) {
  if (!time) return null;

  const [h, m] = time.split(':').map(Number);

  if (
    isNaN(h) || isNaN(m) ||
    h < 0 || h > 23 ||
    m < 0 || m > 59
  ) {
    return null;
  }

  return h * 60 + m;
}

/**
 * Validate shift-time deviation.
 * Pure function — no React dependencies.
 */
export function validateShiftTime({
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