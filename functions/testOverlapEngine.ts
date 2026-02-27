import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// === Copy of overlap engine from submitTimeEntry v5.1 ===
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
function isTime(t) { return typeof t === 'string' && TIME_RE.test(t); }
function timeMin(t) { if (!isTime(t)) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; }
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function effectiveEndDate(service) {
  if (service.end_date) return service.end_date;
  const s = timeMin(service.start_time), e = timeMin(service.end_time);
  if (s !== null && e !== null && e <= s) return addDays(service.date, 1);
  return service.date;
}

function servicesOverlap(existing, incoming) {
  const exStart = existing.date;
  const exEnd = effectiveEndDate(existing);
  const newStart = incoming.date;
  const newEnd = effectiveEndDate(incoming);

  if (exEnd < newStart || newEnd < exStart) return false;

  if (exStart === exEnd && newStart === newEnd && exStart === newStart) {
    const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
    const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
    if (ns === null || ne === null || es === null || ee === null) return false;
    return ns < ee && ne > es;
  }

  if (exStart < newEnd && exEnd > newStart) {
    return true;
  }

  const ns = timeMin(incoming.start_time), ne = timeMin(incoming.end_time);
  const es = timeMin(existing.start_time), ee = timeMin(existing.end_time);
  if (exEnd === newStart && ee !== null && ns !== null) {
    return ee > ns;
  }
  if (newEnd === exStart && ne !== null && es !== null) {
    return ne > es;
  }
  return false;
}
// === End copy ===

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const results = [];

  // Test A: 23:30→06:00 (27 feb) + 05:00→12:00 (28 feb) → MUST overlap
  const testA_existing = { date: '2026-02-27', end_date: null, start_time: '23:30', end_time: '06:00' };
  const testA_new = { date: '2026-02-28', end_date: null, start_time: '05:00', end_time: '12:00' };
  const testA_result = servicesOverlap(testA_existing, testA_new);
  results.push({
    test: 'A: Night 23:30→06:00 vs next-day 05:00→12:00',
    expected: true,
    actual: testA_result,
    pass: testA_result === true,
    effEndEx: effectiveEndDate(testA_existing),
    effEndNew: effectiveEndDate(testA_new),
  });

  // Test B: 23:30→06:00 (27 feb) + 06:00→12:00 (28 feb) → must NOT overlap
  const testB_new = { date: '2026-02-28', end_date: null, start_time: '06:00', end_time: '12:00' };
  const testB_result = servicesOverlap(testA_existing, testB_new);
  results.push({
    test: 'B: Night 23:30→06:00 vs next-day 06:00→12:00',
    expected: false,
    actual: testB_result,
    pass: testB_result === false,
    effEndEx: effectiveEndDate(testA_existing),
    effEndNew: effectiveEndDate(testB_new),
  });

  // Test C: 22:00→02:00 + 01:00→03:00 (next day) → MUST overlap
  const testC_existing = { date: '2026-02-27', end_date: null, start_time: '22:00', end_time: '02:00' };
  const testC_new = { date: '2026-02-28', end_date: null, start_time: '01:00', end_time: '03:00' };
  const testC_result = servicesOverlap(testC_existing, testC_new);
  results.push({
    test: 'C: Night 22:00→02:00 vs next-day 01:00→03:00',
    expected: true,
    actual: testC_result,
    pass: testC_result === true,
    effEndEx: effectiveEndDate(testC_existing),
    effEndNew: effectiveEndDate(testC_new),
  });

  // Test D: Regular day 08:00→17:00 + 08:30→16:30 same day → MUST overlap
  const testD_existing = { date: '2026-02-27', end_date: null, start_time: '08:00', end_time: '17:00' };
  const testD_new = { date: '2026-02-27', end_date: null, start_time: '08:30', end_time: '16:30' };
  const testD_result = servicesOverlap(testD_existing, testD_new);
  results.push({
    test: 'D: Day 08:00→17:00 vs same-day 08:30→16:30 (regression)',
    expected: true,
    actual: testD_result,
    pass: testD_result === true,
  });

  // Test E: Regular 08:00→17:00 vs next day 08:00→17:00 → must NOT overlap
  const testE_new = { date: '2026-02-28', end_date: null, start_time: '08:00', end_time: '17:00' };
  const testE_result = servicesOverlap(testD_existing, testE_new);
  results.push({
    test: 'E: Day 08:00→17:00 (27th) vs 08:00→17:00 (28th) (no overlap)',
    expected: false,
    actual: testE_result,
    pass: testE_result === false,
  });

  // Test F: 17:00→17:00 should NOT self-overlap (edge: equal times)
  const testF_existing = { date: '2026-02-27', end_date: null, start_time: '08:00', end_time: '17:00' };
  const testF_new = { date: '2026-02-27', end_date: null, start_time: '17:00', end_time: '23:00' };
  const testF_result = servicesOverlap(testF_existing, testF_new);
  results.push({
    test: 'F: 08:00→17:00 vs 17:00→23:00 same day (boundary, no overlap)',
    expected: false,
    actual: testF_result,
    pass: testF_result === false,
  });

  // Test G: Night shift same day — 22:00→06:00 vs 20:00→23:00 same start date → MUST overlap
  const testG_existing = { date: '2026-02-27', end_date: null, start_time: '22:00', end_time: '06:00' };
  const testG_new = { date: '2026-02-27', end_date: null, start_time: '20:00', end_time: '23:00' };
  const testG_result = servicesOverlap(testG_existing, testG_new);
  results.push({
    test: 'G: Night 22:00→06:00 vs same-day 20:00→23:00 (overlap on start)',
    expected: true,
    actual: testG_result,
    pass: testG_result === true,
  });

  // Test H: Two back-to-back nights — 22:00→06:00 (27th) + 22:00→06:00 (28th) → must NOT overlap
  const testH_existing = { date: '2026-02-27', end_date: null, start_time: '22:00', end_time: '06:00' };
  const testH_new = { date: '2026-02-28', end_date: null, start_time: '22:00', end_time: '06:00' };
  const testH_result = servicesOverlap(testH_existing, testH_new);
  results.push({
    test: 'H: Back-to-back nights 22:00→06:00 (27th) + 22:00→06:00 (28th)',
    expected: false,
    actual: testH_result,
    pass: testH_result === false,
    effEndEx: effectiveEndDate(testH_existing),
    effEndNew: effectiveEndDate(testH_new),
  });

  const allPassed = results.every(r => r.pass);

  return Response.json({
    summary: allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌',
    total: results.length,
    passed: results.filter(r => r.pass).length,
    failed: results.filter(r => !r.pass).length,
    results,
  });
});