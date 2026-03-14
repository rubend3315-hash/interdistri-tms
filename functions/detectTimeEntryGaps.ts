import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Parse "HH:MM" → minutes since midnight
function timeMin(t) {
  if (!t || typeof t !== 'string') return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Format minutes since midnight → "HH:MM"
function minToTime(m) {
  const normalized = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const min = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Normalize a time relative to an anchor (dienst start).
// Maps all times into a 24h window [anchor, anchor+1440).
function normalizeToAnchor(anchor, timeMinVal) {
  const offset = ((timeMinVal - anchor) % 1440 + 1440) % 1440;
  return anchor + offset;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { time_entry_id } = await req.json();
  if (!time_entry_id) {
    return Response.json({ error: 'time_entry_id is required' }, { status: 400 });
  }

  const svc = base44.asServiceRole;

  // Fetch TimeEntry + linked activities in parallel
  const [timeEntries, trips, spwRecords] = await Promise.all([
    svc.entities.TimeEntry.filter({ id: time_entry_id }),
    svc.entities.Trip.filter({ time_entry_id }),
    svc.entities.StandplaatsWerk.filter({ time_entry_id }),
  ]);

  if (!timeEntries.length) {
    return Response.json({ error: 'TimeEntry not found' }, { status: 404 });
  }

  const te = timeEntries[0];
  const teStart = timeMin(te.start_time);
  const teEnd = timeMin(te.end_time);

  if (teStart === null || teEnd === null) {
    return Response.json({ gaps: [], message: 'TimeEntry has no valid start/end time' });
  }

  // Use dienst-start as anchor for overnight normalization
  const anchor = teStart;
  const teEndN = normalizeToAnchor(anchor, teEnd);

  // Build unified activity list with normalized times
  const activities = [];

  for (const trip of trips) {
    const s = timeMin(trip.departure_time);
    const e = timeMin(trip.arrival_time);
    if (s === null || e === null) continue;
    const sN = normalizeToAnchor(anchor, s);
    let eN = normalizeToAnchor(anchor, e);
    if (eN <= sN) eN += 1440;
    activities.push({ start: sN, end: eN, type: 'trip', label: trip.route_name || 'Rit' });
  }

  for (const spw of spwRecords) {
    const s = timeMin(spw.start_time);
    const e = timeMin(spw.end_time);
    if (s === null || e === null) continue;
    const sN = normalizeToAnchor(anchor, s);
    let eN = normalizeToAnchor(anchor, e);
    if (eN <= sN) eN += 1440;
    activities.push({ start: sN, end: eN, type: 'standplaats', label: 'Standplaatswerk' });
  }

  // Sort by start time
  activities.sort((a, b) => a.start - b.start);

  // Detect gaps
  const gaps = [];
  let cursor = anchor; // start at dienst-start

  for (const act of activities) {
    if (act.start > cursor + 5) {
      // Gap found: cursor → act.start
      gaps.push({
        start: minToTime(cursor),
        end: minToTime(act.start),
        duration_minutes: act.start - cursor,
      });
    }
    // Advance cursor to the end of this activity (or keep if already further)
    if (act.end > cursor) {
      cursor = act.end;
    }
  }

  // Check gap between last activity and dienst-end
  if (teEndN > cursor + 5) {
    gaps.push({
      start: minToTime(cursor),
      end: minToTime(teEndN),
      duration_minutes: teEndN - cursor,
    });
  }

  console.log(`[detectTimeEntryGaps] TE=${time_entry_id} dienst=${te.start_time}-${te.end_time} activities=${activities.length} gaps=${gaps.length}`);

  return Response.json({
    time_entry_id,
    dienst: { start: te.start_time, end: te.end_time, date: te.date, end_date: te.end_date },
    activity_count: activities.length,
    gaps,
    total_gap_minutes: gaps.reduce((sum, g) => sum + g.duration_minutes, 0),
  });
});