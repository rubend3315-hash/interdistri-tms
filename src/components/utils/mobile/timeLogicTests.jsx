/*
 * Mobile Entry — Time Logic Test Matrix
 *
 * Runtime regressietests voor:
 * A) PostNL autorit +1 offset
 * B) Dienst sync +2 offset
 * C) 5-minuten validatie
 * D) Overlap detectie
 * E) Timeline consistency
 *
 * Gebruik: import { runTimeLogicTests } from "./timeLogicTests";
 *          const results = runTimeLogicTests();
 */

import { TimePolicy, applyPostnlOffset, applyDienstSyncOffset, isWithinMargin, formatMinutes } from "./timePolicy";
import { calcDienstEndFromRit } from "./syncDienstEndTime";
import { findOverlaps, findGaps, validateMargin, timeToMinutes } from "./dienstRegelValidation";
import { assertTimeline } from "./assertTimelineConsistency";

function assert(condition, name) {
  return { name, passed: !!condition };
}

// ─── BLOK A: PostNL Autorit ───

function testA1_postNLOffset() {
  const dienstStart = 8 * 60 + 15; // 08:15
  const ritStart = applyPostnlOffset(dienstStart);
  return assert(ritStart === 8 * 60 + 16, "A1: Dienst 08:15 → rit 08:16 (+1)");
}

function testA2_offsetValueIsExactlyOne() {
  return assert(TimePolicy.POSTNL_OFFSET_MIN === 1, "A2: PostNL offset === 1 (geen drift)");
}

function testA3_formatMinutesCorrect() {
  const result = formatMinutes(applyPostnlOffset(8 * 60 + 15));
  return assert(result === "08:16", "A3: formatMinutes(08:15+1) === '08:16'");
}

// ─── BLOK B: Dienst Sync +2 ───

function testB1_dienstSync() {
  const result = calcDienstEndFromRit("15:00");
  return assert(result === "15:02", "B1: Rit eind 15:00 → dienst 15:02");
}

function testB2_dienstSyncMidnight() {
  const result = calcDienstEndFromRit("23:59");
  return assert(result === "00:01", "B2: Rit eind 23:59 → dienst 00:01 (overflow)");
}

function testB3_dienstSyncNull() {
  const result = calcDienstEndFromRit(null);
  return assert(result === null, "B3: Null input → null output");
}

function testB4_dienstSyncEmpty() {
  const result = calcDienstEndFromRit("");
  return assert(result === null, "B4: Lege input → null output");
}

function testB5_offsetValueIsExactlyTwo() {
  return assert(TimePolicy.DIENST_SYNC_OFFSET_MIN === 2, "B5: Dienst sync offset === 2");
}

function testB6_applyDienstSyncDirect() {
  const endMin = 15 * 60; // 15:00
  const result = applyDienstSyncOffset(endMin);
  return assert(result === 15 * 60 + 2, "B6: applyDienstSyncOffset(15:00) === 902");
}

// ─── BLOK C: 5-Minuten Validatie ───

function testC1_gapWithinMargin() {
  return assert(isWithinMargin(3), "C1: Gap 3 min → binnen marge");
}

function testC2_gapExceedsMargin() {
  return assert(!isWithinMargin(6), "C2: Gap 6 min → buiten marge");
}

function testC3_gapExactMargin() {
  return assert(isWithinMargin(5), "C3: Gap 5 min → exact op marge (toegestaan)");
}

function testC4_marginValueIsExactlyFive() {
  return assert(TimePolicy.VALIDATION_MARGIN_MIN === 5, "C4: Validatie marge === 5");
}

function testC5_validateMarginNoMutation() {
  const regels = [{ start_time: "08:20", end_time: "15:00" }];
  const original = JSON.stringify(regels);
  validateMargin(regels, "08:15", "15:05");
  return assert(JSON.stringify(regels) === original, "C5: validateMargin muteert input niet");
}

function testC6_findGapsNoMutation() {
  const regels = [{ start_time: "08:20", end_time: "14:00" }, { start_time: "14:30", end_time: "15:00" }];
  const original = JSON.stringify(regels);
  findGaps(regels, "08:15", "15:05");
  return assert(JSON.stringify(regels) === original, "C6: findGaps muteert input niet");
}

// ─── BLOK D: Overlap ───

function testD1_overlapDetected() {
  const regels = [
    { start_time: "08:16", end_time: "12:00" },
    { start_time: "11:00", end_time: "15:00" },
  ];
  const overlaps = findOverlaps(regels);
  return assert(overlaps.length > 0, "D1: Overlap gedetecteerd");
}

function testD2_noOverlap() {
  const regels = [
    { start_time: "08:16", end_time: "12:00" },
    { start_time: "12:00", end_time: "15:00" },
  ];
  const overlaps = findOverlaps(regels);
  return assert(overlaps.length === 0, "D2: Geen overlap bij aansluiting");
}

function testD3_overlapNoMutation() {
  const regels = [
    { start_time: "08:16", end_time: "12:00" },
    { start_time: "11:00", end_time: "15:00" },
  ];
  const originals = regels.map(r => ({ ...r }));
  findOverlaps(regels);
  const noMutation = regels.every((r, i) =>
    r.start_time === originals[i].start_time && r.end_time === originals[i].end_time
  );
  return assert(noMutation, "D3: findOverlaps muteert input niet");
}

// ─── BLOK E: Timeline Consistency ───

function testE1_validTimeline() {
  const regels = [
    { start_time: "08:16", end_time: "12:00" },
    { start_time: "12:00", end_time: "15:00" },
  ];
  return assert(assertTimeline({}, regels) === true, "E1: Correcte volgorde → true");
}

function testE2_invalidTimeline() {
  const regels = [
    { start_time: "08:16", end_time: "12:00" },
    { start_time: "11:00", end_time: "15:00" },
  ];
  return assert(assertTimeline({}, regels) === false, "E2: Overlap → false");
}

function testE3_emptyTimeline() {
  return assert(assertTimeline({}, []) === true, "E3: Lege regels → true");
}

// ─── Runner ───

export function runTimeLogicTests() {
  const tests = [
    testA1_postNLOffset, testA2_offsetValueIsExactlyOne, testA3_formatMinutesCorrect,
    testB1_dienstSync, testB2_dienstSyncMidnight, testB3_dienstSyncNull,
    testB4_dienstSyncEmpty, testB5_offsetValueIsExactlyTwo, testB6_applyDienstSyncDirect,
    testC1_gapWithinMargin, testC2_gapExceedsMargin, testC3_gapExactMargin,
    testC4_marginValueIsExactlyFive, testC5_validateMarginNoMutation, testC6_findGapsNoMutation,
    testD1_overlapDetected, testD2_noOverlap, testD3_overlapNoMutation,
    testE1_validTimeline, testE2_invalidTimeline, testE3_emptyTimeline,
  ];

  const results = tests.map(fn => {
    try { return fn(); }
    catch (e) { return { name: fn.name, passed: false, error: e.message }; }
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed);

  return { total: results.length, passed, failed: failed.length, results, allPassed: failed.length === 0 };
}