import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Parse "HH:MM" → minutes since midnight
function timeMin(t) {
  if (!t || typeof t !== 'string') return null;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Format minutes → "HH:MM" (handles values > 1440)
function minToTime(m) {
  const normalized = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

// Parse "YYYY-MM-DD" + "HH:MM" → absolute minutes from epoch-ish reference
// Using day-offset from a fixed reference so we get a linear timeline
function toAbsoluteMinutes(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const mins = timeMin(timeStr);
  if (mins === null) return null;
  const d = new Date(dateStr + 'T12:00:00Z');
  // Days since 2020-01-01 as a stable reference
  const ref = new Date('2020-01-01T12:00:00Z');
  const dayOffset = Math.round((d - ref) / 86400000);
  return dayOffset * 1440 + mins;
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
  const teStartMin = timeMin(te.start_time);
  const teEndMin = timeMin(te.end_time);

  if (teStartMin === null || teEndMin === null) {
    return Response.json({ gaps: [], total_gap_minutes: 0, message: 'TimeEntry has no valid start/end time' });
  }

  // Build absolute start/end for the TimeEntry
  const teStartAbs = toAbsoluteMinutes(te.date, te.start_time);
  // end_date determines the calendar day of end_time
  const teEndDate = te.end_date || te.date;
  let teEndAbs = toAbsoluteMinutes(teEndDate, te.end_time);
  // Safety: if end <= start (no end_date set but overnight), add 1 day
  if (teEndAbs <= teStartAbs) teEndAbs += 1440;

  // Build unified activity list with absolute datetime minutes
  const activities = [];

  for (const trip of trips) {
    const s = timeMin(trip.departure_time);
    const e = timeMin(trip.arrival_time);
    if (s === null || e === null) continue;

    const actDate = trip.date || te.date;
    const startAbs = toAbsoluteMinutes(actDate, trip.departure_time);
    let endAbs = toAbsoluteMinutes(actDate, trip.arrival_time);
    // If end_time < start_time, activity crosses midnight → +1 day
    if (endAbs <= startAbs) endAbs += 1440;

    activities.push({ startAbs, endAbs, type: 'trip', label: trip.route_name || 'Rit' });
  }

  for (const spw of spwRecords) {
    const s = timeMin(spw.start_time);
    const e = timeMin(spw.end_time);
    if (s === null || e === null) continue;

    const actDate = spw.date || te.date;
    const startAbs = toAbsoluteMinutes(actDate, spw.start_time);
    let endAbs = toAbsoluteMinutes(actDate, spw.end_time);
    if (endAbs <= startAbs) endAbs += 1440;

    activities.push({ startAbs, endAbs, type: 'standplaats', label: 'Standplaatswerk' });
  }

  // Sort chronologically by absolute start datetime
  activities.sort((a, b) => a.startAbs - b.startAbs);

  // Merge overlapping/adjacent activities into consolidated intervals
  const merged = [];
  for (const act of activities) {
    if (merged.length === 0) {
      merged.push({ start: act.startAbs, end: act.endAbs });
    } else {
      const last = merged[merged.length - 1];
      if (act.startAbs <= last.end) {
        // Overlapping or adjacent → extend
        last.end = Math.max(last.end, act.endAbs);
      } else {
        merged.push({ start: act.startAbs, end: act.endAbs });
      }
    }
  }

  // Detect gaps (>5 minutes)
  const gaps = [];
  let cursor = teStartAbs;

  for (const interval of merged) {
    const gapDuration = interval.start - cursor;
    if (gapDuration > 5) {
      gaps.push({
        start: minToTime(cursor),
        end: minToTime(interval.start),
        duration_minutes: gapDuration,
      });
    }
    cursor = Math.max(cursor, interval.end);
  }

  // Gap between last activity and dienst-end
  const finalGap = teEndAbs - cursor;
  if (finalGap > 5) {
    gaps.push({
      start: minToTime(cursor),
      end: minToTime(teEndAbs),
      duration_minutes: finalGap,
    });
  }

  const totalGapMinutes = gaps.reduce((sum, g) => sum + g.duration_minutes, 0);

  console.log(`[detectTimeEntryGaps] TE=${time_entry_id} dienst=${te.start_time}-${te.end_time} (${te.date}→${teEndDate}) activities=${activities.length} merged=${merged.length} gaps=${gaps.length} total_gap=${totalGapMinutes}min`);

  return Response.json({
    time_entry_id,
    dienst: { start: te.start_time, end: te.end_time, date: te.date, end_date: te.end_date },
    activity_count: activities.length,
    gaps,
    total_gap_minutes: totalGapMinutes,
  });
});