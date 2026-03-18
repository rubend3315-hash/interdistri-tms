import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * linkActivityToTimeEntry — Centrale backend functie voor automatische koppeling
 * van Trip/StandplaatsWerk aan een TimeEntry met status "Ingediend".
 *
 * Input:
 *   employee_id          - Medewerker ID
 *   activity_date        - Datum van de activiteit (YYYY-MM-DD)
 *   activity_start_time  - Starttijd activiteit (HH:MM)
 *   activity_end_time    - Eindtijd activiteit (HH:MM)
 *   existing_time_entry_id - Huidige time_entry_id (null als nog niet gekoppeld)
 *
 * Output:
 *   { time_entry_id: string | null }
 */

// --- Inline time utilities (backend functions cannot import local files) ---

function timeToMinutes(time) {
  if (!time || time.length < 5) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function normalizeToAnchor(anchor, timeMin) {
  const offset = ((timeMin - anchor) % 1440 + 1440) % 1440;
  return anchor + offset;
}

/**
 * Check if activity falls fully within a TimeEntry.
 * Uses anchor-based normalization for correct overnight handling.
 */
function activityWithinTimeEntry(actStartTime, actEndTime, teStartTime, teEndTime) {
  const teStart = timeToMinutes(teStartTime);
  const teEnd = timeToMinutes(teEndTime);
  const actStart = timeToMinutes(actStartTime);
  const actEnd = timeToMinutes(actEndTime);

  if (teStart === null || teEnd === null || actStart === null || actEnd === null) {
    return false;
  }

  // Use TimeEntry start as anchor for the continuous timeline
  const anchor = teStart;
  const teEndN = normalizeToAnchor(anchor, teEnd);
  // If te wraps midnight: e.g. 20:30→03:45 → teEndN would be anchor + small offset
  // normalizeToAnchor handles this: 03:45 relative to 20:30 → 20:30 + ((225-1230)%1440+1440)%1440 = 20:30 + 435 = 1665 min
  const teEndFinal = teEndN <= teStart ? teEndN + 1440 : teEndN;

  const actStartN = normalizeToAnchor(anchor, actStart);
  const actEndN = normalizeToAnchor(anchor, actEnd);
  const actEndFinal = actEndN <= actStartN ? actEndN + 1440 : actEndN;

  return actStartN >= teStart && actEndFinal <= teEndFinal;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { employee_id, activity_date, activity_start_time, activity_end_time, existing_time_entry_id } = body;

    // SAFEGUARD: never overwrite an existing link
    if (existing_time_entry_id) {
      console.log(`[linkActivity] Skipped: existing_time_entry_id '${existing_time_entry_id}' already set (activity ${activity_date})`);
      return Response.json({ time_entry_id: existing_time_entry_id });
    }

    // Validate required params
    if (!employee_id || !activity_date || !activity_start_time || !activity_end_time) {
      return Response.json({ error: 'Missing required parameters: employee_id, activity_date, activity_start_time, activity_end_time' }, { status: 400 });
    }

    // Calculate search range: activity_date ± 1 day
    const d = new Date(activity_date + 'T12:00:00Z');
    const prev = new Date(d); prev.setDate(d.getDate() - 1);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const dateFrom = prev.toISOString().split('T')[0];
    const dateTo = next.toISOString().split('T')[0];

    // Fetch potential TimeEntries (max 10, sorted by start_time DESC)
    const potentialEntries = await base44.asServiceRole.entities.TimeEntry.filter({
      employee_id,
      status: "Ingediend",
      date: { $gte: dateFrom, $lte: dateTo }
    }, '-start_time', 10);

    // Evaluate each TimeEntry for a full containment match
    let matchedId = null;
    for (const te of potentialEntries) {
      if (!te.start_time || !te.end_time) continue;
      if (activityWithinTimeEntry(activity_start_time, activity_end_time, te.start_time, te.end_time)) {
        matchedId = te.id;
        console.log(`[linkActivity] Auto-linked activity ${activity_date} ${activity_start_time}-${activity_end_time} → TimeEntry ${matchedId}`);
        break;
      }
    }

    if (!matchedId) {
      console.log(`[linkActivity] No matching TimeEntry for employee ${employee_id}, activity ${activity_date} ${activity_start_time}-${activity_end_time}`);
    }

    return Response.json({ time_entry_id: matchedId });
  } catch (error) {
    console.error('[linkActivity] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});