import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// cleanupOrphanTimeEntries — Scheduled orphan cleanup job (redeployed 2026-03-01)
// ============================================================
//
// Runs on a schedule (every 6 hours). Cleans up:
//   1. Concept TimeEntries older than 24 hours (crashed/abandoned submits)
//   2. Orphan Trip records not linked to any existing TimeEntry
//   3. Orphan StandplaatsWerk records not linked to any existing TimeEntry
//
// SAFETY:
//   - NEVER touches Ingediend, Goedgekeurd, or Afgekeurd entries
//   - Only deletes Concept entries older than 24h (safe grace period)
//   - Logs everything for audit trail
//   - Admin-only endpoint
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin-only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    // Paginated fetch helper — SDK bug workaround
    async function paginatedFilter(entity, query, sortField) {
      const all = [];
      let skip = 0;
      const PAGE = 20;
      while (true) {
        const page = await entity.filter(query, sortField || '-created_date', PAGE, skip);
        if (!Array.isArray(page) || page.length === 0) break;
        all.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      return all;
    }

    const stats = {
      concept_entries_deleted: 0,
      orphan_trips_deleted: 0,
      orphan_spw_deleted: 0,
      errors: [],
    };

    // ========================================
    // 1. FIND & DELETE STALE CONCEPT ENTRIES
    // ========================================
    console.log('[CLEANUP] Fetching Concept TimeEntries...');
    const conceptEntries = await paginatedFilter(svc.entities.TimeEntry, { status: 'Concept' });
    console.log(`[CLEANUP] Found ${conceptEntries.length} Concept entries total`);

    for (const entry of conceptEntries) {
      const createdAt = new Date(entry.created_date).getTime();
      const age = now - createdAt;

      if (age > TWENTY_FOUR_HOURS) {
        console.log(`[CLEANUP] Deleting stale Concept ${entry.id} (age: ${Math.round(age / 3600000)}h, date: ${entry.date}, employee: ${entry.employee_id})`);

        // Delete child records first
        try {
          const [trips, spws] = await Promise.all([
            svc.entities.Trip.filter({ time_entry_id: entry.id }),
            svc.entities.StandplaatsWerk.filter({ time_entry_id: entry.id }),
          ]);

          for (const trip of trips) {
            try {
              await svc.entities.Trip.delete(trip.id);
              stats.orphan_trips_deleted++;
            } catch (e) {
              stats.errors.push(`Trip ${trip.id}: ${e.message}`);
              console.error(`[CLEANUP] Failed to delete Trip ${trip.id}: ${e.message}`);
            }
          }

          for (const spw of spws) {
            try {
              await svc.entities.StandplaatsWerk.delete(spw.id);
              stats.orphan_spw_deleted++;
            } catch (e) {
              stats.errors.push(`SPW ${spw.id}: ${e.message}`);
              console.error(`[CLEANUP] Failed to delete SPW ${spw.id}: ${e.message}`);
            }
          }

          await svc.entities.TimeEntry.delete(entry.id);
          stats.concept_entries_deleted++;
        } catch (e) {
          stats.errors.push(`TimeEntry ${entry.id}: ${e.message}`);
          console.error(`[CLEANUP] Failed to delete TimeEntry ${entry.id}: ${e.message}`);
        }
      }
    }

    // ========================================
    // 2. FIND ORPHAN TRIPS (no parent TimeEntry)
    // ========================================
    // Get all Trip records with status Gepland (drafts) older than 24h
    console.log('[CLEANUP] Checking for orphan Trips...');
    const draftTrips = await paginatedFilter(svc.entities.Trip, { status: 'Gepland' });

    for (const trip of draftTrips) {
      const createdAt = new Date(trip.created_date).getTime();
      if (now - createdAt > TWENTY_FOUR_HOURS) {
        // Check if parent TimeEntry exists
        if (trip.time_entry_id) {
          try {
            const parentEntries = await svc.entities.TimeEntry.filter({ id: trip.time_entry_id });
            if (!parentEntries.length) {
              console.log(`[CLEANUP] Deleting orphan Trip ${trip.id} (parent ${trip.time_entry_id} not found)`);
              await svc.entities.Trip.delete(trip.id);
              stats.orphan_trips_deleted++;
            }
          } catch (e) {
            stats.errors.push(`Orphan Trip ${trip.id}: ${e.message}`);
          }
        } else {
          // No time_entry_id at all — legacy orphan
          console.log(`[CLEANUP] Deleting legacy orphan Trip ${trip.id} (no time_entry_id)`);
          try {
            await svc.entities.Trip.delete(trip.id);
            stats.orphan_trips_deleted++;
          } catch (e) {
            stats.errors.push(`Legacy Trip ${trip.id}: ${e.message}`);
          }
        }
      }
    }

    // ========================================
    // 3. FIND ORPHAN STANDPLAATSWERK (no parent TimeEntry)
    // ========================================
    console.log('[CLEANUP] Checking for orphan StandplaatsWerk...');
    // Get StandplaatsWerk records that have a time_entry_id but parent doesn't exist
    // We can't filter by "time_entry_id exists" so we check all recent ones
    const allSpw = await paginatedFilter(svc.entities.StandplaatsWerk, {}, '-created_date');

    for (const spw of allSpw) {
      const createdAt = new Date(spw.created_date).getTime();
      if (now - createdAt > TWENTY_FOUR_HOURS && spw.time_entry_id) {
        try {
          const parentEntries = await svc.entities.TimeEntry.filter({ id: spw.time_entry_id });
          if (!parentEntries.length) {
            console.log(`[CLEANUP] Deleting orphan SPW ${spw.id} (parent ${spw.time_entry_id} not found)`);
            await svc.entities.StandplaatsWerk.delete(spw.id);
            stats.orphan_spw_deleted++;
          }
        } catch (e) {
          stats.errors.push(`Orphan SPW ${spw.id}: ${e.message}`);
        }
      }
    }

    // ========================================
    // 4. SUMMARY
    // ========================================
    console.log(`[CLEANUP DONE] Deleted: ${stats.concept_entries_deleted} concepts, ${stats.orphan_trips_deleted} trips, ${stats.orphan_spw_deleted} spw. Errors: ${stats.errors.length}`);

    return Response.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[CLEANUP FATAL]', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});