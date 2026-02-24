/**
 * Dienstregel validation utilities.
 * Uses minute-based arithmetic (no string comparisons).
 * All times normalized to an absolute minute offset from midnight,
 * with overnight handling (+1440 when end <= start).
 */

const MARGIN_MINUTES = 5;

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
 * Validate that all dienstRegels fall within dienst times + 5 min inner margin.
 * regel.start >= dienst.start + 5
 * regel.end   <= dienst.end - 5
 *
 * Returns { valid: boolean, errors: string[] }
 */
export function validateMargin(dienstRegels, dienstStartTime, dienstEndTime) {
  const svcStart = timeToMinutes(dienstStartTime);
  const svcEnd = timeToMinutes(dienstEndTime);
  if (svcStart === null || svcEnd === null) return { valid: true, errors: [] };
  const svcEndN = normalizeEnd(svcStart, svcEnd);

  const minStart = svcStart + MARGIN_MINUTES;
  const maxEnd = svcEndN - MARGIN_MINUTES;

  const errors = [];
  const intervals = buildIntervals(dienstRegels);

  for (const iv of intervals) {
    const regelStart = iv.start < svcStart ? iv.start + 1440 : iv.start;
    const regelEnd = iv.end < svcStart ? iv.end + 1440 : iv.end;

    if (regelStart < minStart) {
      errors.push(`Regel ${iv.index + 1}: starttijd valt buiten de 5-minuten marge na start dienst.`);
    }
    if (regelEnd > maxEnd) {
      errors.push(`Regel ${iv.index + 1}: eindtijd valt buiten de 5-minuten marge voor eind dienst.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a single regel against dienst margin.
 * For OPEN rits (no end_time), only validate start margin.
 * Returns error string or null.
 */
export function validateSingleRegelMargin(regel, dienstStartTime, dienstEndTime) {
  const svcStart = timeToMinutes(dienstStartTime);
  const rStart = timeToMinutes(regel.start_time);
  const rEnd = timeToMinutes(regel.end_time);

  if (svcStart === null || rStart === null) return null;

  const minStart = svcStart + MARGIN_MINUTES;
  const regelStart = rStart < svcStart ? rStart + 1440 : rStart;

  // OPEN rit: only check start margin
  if (rEnd === null) {
    if (regelStart < minStart) {
      return "Starttijd moet minimaal 5 minuten na start dienst liggen.";
    }
    return null;
  }

  // Closed rit: full margin check
  const svcEnd = timeToMinutes(dienstEndTime);
  if (svcEnd === null) return null;

  const svcEndN = normalizeEnd(svcStart, svcEnd);
  const maxEnd = svcEndN - MARGIN_MINUTES;

  const regelEnd = normalizeEnd(rStart, rEnd);
  const regelEndN = regelEnd < svcStart ? regelEnd + 1440 : regelEnd;

  if (regelStart < minStart || regelEndN > maxEnd) {
    return "Dienstregel moet minimaal 5 minuten binnen de diensttijd vallen.";
  }
  return null;
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
  if (startGap > MARGIN_MINUTES) {
    errors.push(`Er zit ${startGap} minuten tussen start dienst (${dienstStartTime}) en je eerste regel. Max ${MARGIN_MINUTES} min toegestaan.`);
  }

  // b) Gap between last regel and dienst end
  const lastEnd = intervals[intervals.length - 1].end;
  const endGap = svcEndN - lastEnd;
  if (endGap > MARGIN_MINUTES) {
    errors.push(`Er zit ${endGap} minuten tussen je laatste regel en eind dienst (${dienstEndTime}). Max ${MARGIN_MINUTES} min toegestaan.`);
  }

  // c) Gaps between consecutive regels
  for (let i = 0; i < intervals.length - 1; i++) {
    const gap = intervals[i + 1].start - intervals[i].end;
    if (gap > MARGIN_MINUTES) {
      errors.push(`Er zit ${gap} minuten tussen regel ${intervals[i].index + 1} en regel ${intervals[i + 1].index + 1}. Max ${MARGIN_MINUTES} min toegestaan.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Full validation for UI display (non-blocking, returns all issues).
 * Skips gap/margin validation if any regel has openRit status (no end_time).
 * Returns { overlaps, gaps, margins, hasOverlap, hasGap, hasMarginError, hasOpenRit }
 */
export function validateDienstRegels(dienstRegels, dienstStartTime, dienstEndTime, isSingleDay) {
  const hasOpenRit = dienstRegels.some(r => r.openRit && !r.end_time);

  // Only check overlaps for closed regels (open rits excluded from buildIntervals)
  const overlapPairs = findOverlaps(dienstRegels);
  const overlapMessages = overlapPairs.map(({ i, j }) =>
    `Dienstregels mogen elkaar niet overlappen (regel ${i + 1} en ${j + 1}).`
  );

  let gapMessages = [];
  let marginMessages = [];

  // Skip gap/margin checks if any open rit exists (end_time not yet known)
  if (!hasOpenRit && isSingleDay && dienstStartTime && dienstEndTime && dienstRegels.length > 0) {
    const allHaveTimes = dienstRegels.every(r => r.start_time && r.end_time);
    if (allHaveTimes) {
      const { errors: gapErrors } = findGaps(dienstRegels, dienstStartTime, dienstEndTime);
      gapMessages = gapErrors;

      const { errors: marginErrors } = validateMargin(dienstRegels, dienstStartTime, dienstEndTime);
      marginMessages = marginErrors;
    }
  }

  return {
    overlaps: overlapMessages,
    gaps: gapMessages,
    margins: marginMessages,
    hasOverlap: overlapMessages.length > 0,
    hasGap: gapMessages.length > 0,
    hasMarginError: marginMessages.length > 0,
    hasOpenRit,
  };
}