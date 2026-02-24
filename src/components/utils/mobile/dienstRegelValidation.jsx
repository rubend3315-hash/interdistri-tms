/**
 * Dienstregel validation utilities.
 * Uses minute-based arithmetic (no string comparisons).
 * All times normalized to an absolute minute offset from midnight,
 * with overnight handling (+1440 when end <= start).
 *
 * Validates:
 * - Overlaps between regels
 * - Bounds: regel.start >= dienst.start, regel.end <= dienst.end
 * - NO margin/gap validation (removed v23)
 */

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
 * Open rits (no end_time) are excluded from interval-based validation.
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
 * Validate that all dienstRegels fall within dienst bounds (no margin).
 * regel.start >= dienst.start
 * regel.end   <= dienst.end
 *
 * Returns { valid: boolean, errors: string[] }
 */
export function validateBounds(dienstRegels, dienstStartTime, dienstEndTime) {
  const svcStart = timeToMinutes(dienstStartTime);
  const svcEnd = timeToMinutes(dienstEndTime);
  if (svcStart === null || svcEnd === null) return { valid: true, errors: [] };
  const svcEndN = normalizeEnd(svcStart, svcEnd);

  const errors = [];
  const intervals = buildIntervals(dienstRegels);

  for (const iv of intervals) {
    const regelStart = iv.start < svcStart ? iv.start + 1440 : iv.start;
    const regelEnd = iv.end < svcStart ? iv.end + 1440 : iv.end;

    if (regelStart < svcStart) {
      errors.push(`Regel ${iv.index + 1}: starttijd valt voor start dienst.`);
    }
    if (regelEnd > svcEndN) {
      errors.push(`Regel ${iv.index + 1}: eindtijd valt na eind dienst.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single regel against dienst bounds (no margin).
 * For OPEN rits (no end_time), only validate start bound.
 * Returns error string or null.
 */
export function validateSingleRegelBounds(regel, dienstStartTime, dienstEndTime) {
  const svcStart = timeToMinutes(dienstStartTime);
  const rStart = timeToMinutes(regel.start_time);
  const rEnd = timeToMinutes(regel.end_time);

  if (svcStart === null || rStart === null) return null;

  const regelStart = rStart < svcStart ? rStart + 1440 : rStart;

  // OPEN rit: only check start bound
  if (rEnd === null) {
    if (regelStart < svcStart) {
      return "Starttijd moet na start dienst liggen.";
    }
    return null;
  }

  // Closed rit: full bounds check
  const svcEnd = timeToMinutes(dienstEndTime);
  if (svcEnd === null) return null;

  const svcEndN = normalizeEnd(svcStart, svcEnd);

  const regelEnd = normalizeEnd(rStart, rEnd);
  const regelEndN = regelEnd < svcStart ? regelEnd + 1440 : regelEnd;

  if (regelStart < svcStart) {
    return "Starttijd moet na start dienst liggen.";
  }
  if (regelEndN > svcEndN) {
    return "Eindtijd moet voor eind dienst liggen.";
  }
  return null;
}

// Legacy exports for backward compatibility — these are now no-ops
export function validateMargin() { return { valid: true, errors: [] }; }
export function findGaps() { return { valid: true, errors: [] }; }

/**
 * Full validation for UI display (non-blocking, returns all issues).
 * Checks overlaps and bounds only. No margin/gap validation.
 * Returns { overlaps, gaps, margins, hasOverlap, hasGap, hasMarginError, hasOpenRit }
 */
export function validateDienstRegels(dienstRegels, dienstStartTime, dienstEndTime, isSingleDay) {
  const hasOpenRit = dienstRegels.some(r => r.openRit && !r.end_time);

  // Overlap check
  const overlapPairs = findOverlaps(dienstRegels);
  const overlapMessages = overlapPairs.map(({ i, j }) =>
    `Dienstregels mogen elkaar niet overlappen (regel ${i + 1} en ${j + 1}).`
  );

  // Bounds check (replaces margin check)
  let boundsMessages = [];
  if (!hasOpenRit && dienstStartTime && dienstEndTime && dienstRegels.length > 0) {
    const allHaveTimes = dienstRegels.every(r => r.start_time && r.end_time);
    if (allHaveTimes) {
      const { errors } = validateBounds(dienstRegels, dienstStartTime, dienstEndTime);
      boundsMessages = errors;
    }
  }

  return {
    overlaps: overlapMessages,
    gaps: [],           // no gap validation
    margins: boundsMessages,
    hasOverlap: overlapMessages.length > 0,
    hasGap: false,      // no gap validation
    hasMarginError: boundsMessages.length > 0,
    hasOpenRit,
  };
}