/**
 * Dienstregel validation utilities.
 * Uses minute-based arithmetic (no string comparisons).
 * All times normalized relative to dienst-start to correctly handle
 * overnight shifts crossing midnight.
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
 * Normalize a time relative to an anchor (dienst start).
 * Maps all times into a 24h window starting from the anchor.
 * E.g. anchor=23:30 (1410): 01:00 → 1500, 22:30 → 2790 (next day), 23:30 → 1410.
 *
 * We compute the offset from the anchor modulo 1440 and add it back.
 * This correctly places all times on a linear axis [anchor, anchor+1440).
 */
function normalizeToAnchor(anchor, timeMin) {
  const offset = ((timeMin - anchor) % 1440 + 1440) % 1440;
  return anchor + offset;
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
 * Build intervals normalized to dienst-start anchor.
 * This ensures overnight comparisons are correct.
 */
function buildAnchoredIntervals(dienstRegels, anchor) {
  return dienstRegels
    .map((regel, index) => {
      const s = timeToMinutes(regel.start_time);
      const e = timeToMinutes(regel.end_time);
      if (s === null || e === null) return null;
      const sN = normalizeToAnchor(anchor, s);
      const eN = normalizeToAnchor(anchor, e);
      // If end <= start after anchoring, it wraps another day
      const eFinal = eN <= sN ? eN + 1440 : eN;
      return { index, start: sN, end: eFinal };
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
 * Validate that all dienstRegels fall within dienst bounds.
 * All times are normalized relative to dienst-start so overnight shifts
 * are handled correctly without special-case logic.
 *
 * Returns { valid: boolean, errors: string[] }
 */
export function validateBounds(dienstRegels, dienstStartTime, dienstEndTime) {
  const svcStart = timeToMinutes(dienstStartTime);
  const svcEnd = timeToMinutes(dienstEndTime);
  if (svcStart === null || svcEnd === null) return { valid: true, errors: [] };

  // Normalize dienst-end relative to dienst-start
  const svcEndN = normalizeToAnchor(svcStart, svcEnd);
  // If dienst-end wraps (e.g. 23:30-03:45), svcEndN = 03:45+1440 only if < svcStart
  // normalizeToAnchor already handles this

  const errors = [];
  const intervals = buildAnchoredIntervals(dienstRegels, svcStart);

  for (const iv of intervals) {
    if (iv.start < svcStart || iv.start > svcEndN) {
      errors.push(`Regel ${iv.index + 1}: starttijd valt buiten dienst.`);
    } else if (iv.end > svcEndN) {
      errors.push(`Regel ${iv.index + 1}: eindtijd valt na eind dienst.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single regel against dienst bounds.
 * For OPEN rits (no end_time), only validate start bound.
 * All times normalized to dienst-start anchor for correct overnight handling.
 * Returns error string or null.
 */
export function validateSingleRegelBounds(regel, dienstStartTime, dienstEndTime) {
  const svcStart = timeToMinutes(dienstStartTime);
  const rStart = timeToMinutes(regel.start_time);

  if (svcStart === null || rStart === null) return null;

  const regelStartN = normalizeToAnchor(svcStart, rStart);

  // OPEN rit: only check start bound
  if (timeToMinutes(regel.end_time) === null) {
    if (regelStartN < svcStart) {
      return "Starttijd moet na start dienst liggen.";
    }
    return null;
  }

  // Closed rit: full bounds check
  const svcEnd = timeToMinutes(dienstEndTime);
  if (svcEnd === null) return null;

  const svcEndN = normalizeToAnchor(svcStart, svcEnd);

  const rEnd = timeToMinutes(regel.end_time);
  const regelEndN = normalizeToAnchor(svcStart, rEnd);
  // If rit-end wraps past rit-start within the anchored frame
  const regelEndFinal = regelEndN <= regelStartN ? regelEndN + 1440 : regelEndN;

  if (regelStartN < svcStart || regelStartN > svcEndN) {
    console.warn(`[Bounds] ROOD: rit ${regel.start_time}-${regel.end_time} start(${regelStartN}) buiten dienst [${svcStart}-${svcEndN}] | dienst ${dienstStartTime}-${dienstEndTime}`);
    return "Starttijd moet binnen dienst liggen.";
  }
  if (regelEndFinal > svcEndN) {
    console.warn(`[Bounds] ROOD: rit ${regel.start_time}-${regel.end_time} end(${regelEndFinal}) > dienst_end(${svcEndN}) | dienst ${dienstStartTime}-${dienstEndTime}`);
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