/**
 * Dienstregel validation utilities.
 * Uses minute-based arithmetic (no string comparisons).
 * All times normalized to an absolute minute offset from midnight,
 * with overnight handling (+1440 when end <= start).
 */

const TOLERANCE_MINUTES = 5;

/**
 * Parse "HH:MM" → minutes since midnight, or null.
 */
export function timeToMinutes(time) {
  if (!time || time.length < 5) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Normalize end time: if end <= start, treat as next day (+1440).
 */
function normalizeEnd(startMin, endMin) {
  return endMin <= startMin ? endMin + 1440 : endMin;
}

/**
 * Build sorted intervals from dienstRegels.
 * Each interval: { index, start, end } (absolute minutes).
 */
function buildIntervals(dienstRegels) {
  return dienstRegels
    .map((regel, index) => {
      const s = timeToMinutes(regel.start_time);
      const e = timeToMinutes(regel.end_time);
      if (s === null || e === null) return null;
      return { index, start: s, end: normalizeEnd(s, e) };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
}

/**
 * Check for overlaps between any two dienstRegels.
 * Returns array of { i, j } pairs that overlap.
 */
export function findOverlaps(dienstRegels) {
  const intervals = buildIntervals(dienstRegels);
  const overlaps = [];
  for (let a = 0; a < intervals.length; a++) {
    for (let b = a + 1; b < intervals.length; b++) {
      if (intervals[a].start < intervals[b].end && intervals[a].end > intervals[b].start) {
        overlaps.push({ i: intervals[a].index, j: intervals[b].index });
      }
    }
  }
  return overlaps;
}

/**
 * Check gaps between dienstRegels and dienst start/end times.
 * Only for single-day entries (multi-day skips gap validation).
 *
 * Returns { valid: boolean, errors: string[] }
 */
export function findGaps(dienstRegels, dienstStartTime, dienstEndTime) {
  const svcStart = timeToMinutes(dienstStartTime);
  const svcEnd = timeToMinutes(dienstEndTime);
  if (svcStart === null || svcEnd === null) return { valid: true, errors: [] };
  const svcEndN = normalizeEnd(svcStart, svcEnd);

  const intervals = buildIntervals(dienstRegels);
  if (intervals.length === 0) return { valid: true, errors: [] };

  const errors = [];

  // a) Gap between dienst start and first regel
  const firstStart = intervals[0].start < svcStart ? intervals[0].start + 1440 : intervals[0].start;
  const startGap = firstStart - svcStart;
  if (startGap > TOLERANCE_MINUTES) {
    errors.push(`Er zit ${startGap} minuten tussen start dienst (${dienstStartTime}) en je eerste regel. Max ${TOLERANCE_MINUTES} min toegestaan.`);
  }

  // b) Gap between last regel and dienst end
  const lastEnd = intervals[intervals.length - 1].end;
  const endGap = svcEndN - lastEnd;
  if (endGap > TOLERANCE_MINUTES) {
    errors.push(`Er zit ${endGap} minuten tussen je laatste regel en eind dienst (${dienstEndTime}). Max ${TOLERANCE_MINUTES} min toegestaan.`);
  }

  // c) Gaps between consecutive regels
  for (let i = 0; i < intervals.length - 1; i++) {
    const gap = intervals[i + 1].start - intervals[i].end;
    if (gap > TOLERANCE_MINUTES) {
      errors.push(`Er zit ${gap} minuten tussen regel ${intervals[i].index + 1} en regel ${intervals[i + 1].index + 1}. Max ${TOLERANCE_MINUTES} min toegestaan.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Full validation for UI display (non-blocking, returns all issues).
 * Returns { overlaps: string[], gaps: string[], hasOverlap: boolean, hasGap: boolean }
 */
export function validateDienstRegels(dienstRegels, dienstStartTime, dienstEndTime, isSingleDay) {
  const overlapPairs = findOverlaps(dienstRegels);
  const overlapMessages = overlapPairs.map(({ i, j }) =>
    `Overlap: regel ${i + 1} en regel ${j + 1} overlappen in tijd.`
  );

  let gapMessages = [];
  if (isSingleDay && dienstStartTime && dienstEndTime && dienstRegels.length > 0) {
    // Only validate gaps if all regels have times
    const allHaveTimes = dienstRegels.every(r => r.start_time && r.end_time);
    if (allHaveTimes) {
      const { errors } = findGaps(dienstRegels, dienstStartTime, dienstEndTime);
      gapMessages = errors;
    }
  }

  return {
    overlaps: overlapMessages,
    gaps: gapMessages,
    hasOverlap: overlapMessages.length > 0,
    hasGap: gapMessages.length > 0,
  };
}