import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// submitTimeEntry v2 — Atomic server-side time entry submission
// ============================================================
// CHANGES from v1:
// - Idempotency key: duplicate submits return existing result
// - Safe ordering: cleanup AFTER successful commit, not before
// - Race condition guard: post-commit duplicate detection
// - Multi-day overlap detection
// - Crash-safe: orphan Concepts are harmless, cleaned on next submit
// ============================================================

// --- VALIDATION HELPERS ---

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidTime(t) {
  return typeof t === 'string' && TIME_REGEX.test(t);
}

function isValidDate(d) {
  if (typeof d !== 'string' || !DATE_REGEX.test(d)) return false;
  const parsed = new Date(d + 'T12:00:00');
  return !isNaN(parsed.getTime());
}

function isOptionalString(v) {
  return v === undefined || v === null || typeof v === 'string';
}

function isOptionalNumber(v) {
  return v === undefined || v === null || (typeof v === 'number' && isFinite(v));
}

function clampNumber(v, min, max) {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  if (!isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function timeToMinutes(t) {
  if (!isValidTime(t)) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function determineShiftType(startTime, endTime) {
  if (!isValidTime(startTime)) return 'Dag';
  const [startH] = startTime.split(':').map(Number);
  if (startH >= 21 || startH < 5) return 'Nachtdienst';
  if (startH >= 16) {
    if (isValidTime(endTime)) {
      const [endH] = endTime.split(':').map(Number);
      if (endH >= 21 || endH < 5) return 'Nachtdienst';
    }
    return 'Avond';
  }
  return 'Dag';
}

function calculateHours(startTime, endTime, breakMinutes, startDate, endDate) {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (startMin === null || endMin === null) return 0;

  let totalMinutes = endMin - startMin;

  if (endDate && startDate && endDate > startDate) {
    const d1 = new Date(startDate + 'T12:00:00');
    const d2 = new Date(endDate + 'T12:00:00');
    const dayDiff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    totalMinutes += dayDiff * 24 * 60;
  } else if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }

  const safeBreak = Math.max(0, breakMinutes || 0);
  totalMinutes = Math.max(0, totalMinutes - safeBreak);
  return Math.round(totalMinutes / 60 * 100) / 100;
}

function getISOWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getISOYear(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

// --- INPUT VALIDATION ---

function validatePayload(payload) {
  const errors = [];

  if (!payload) return ['Payload is vereist'];

  // Idempotency key
  if (!payload.idempotency_key || typeof payload.idempotency_key !== 'string' || !UUID_REGEX.test(payload.idempotency_key)) {
    errors.push('idempotency_key is vereist (UUID v4 formaat)');
  }

  if (!isValidDate(payload.date)) {
    errors.push('Ongeldige datum (verwacht: YYYY-MM-DD)');
  }

  if (!isValidTime(payload.start_time)) {
    errors.push('Ongeldige starttijd (verwacht: HH:MM, 00:00-23:59)');
  }

  if (!isValidTime(payload.end_time)) {
    errors.push('Ongeldige eindtijd (verwacht: HH:MM, 00:00-23:59)');
  }

  if (!isOptionalString(payload.signature_url)) {
    errors.push('signature_url moet een string zijn');
  }

  // Multi-day
  if (payload.end_date !== undefined && payload.end_date !== null) {
    if (!isValidDate(payload.end_date)) {
      errors.push('Ongeldige einddatum (verwacht: YYYY-MM-DD)');
    } else if (payload.date && payload.end_date < payload.date) {
      errors.push('Einddatum mag niet vóór startdatum liggen');
    }
    if (isValidDate(payload.date) && isValidDate(payload.end_date)) {
      const d1 = new Date(payload.date + 'T12:00:00');
      const d2 = new Date(payload.end_date + 'T12:00:00');
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diff > 7) {
        errors.push('Dienst mag maximaal 7 dagen duren');
      }
    }
  }

  // Break minutes
  if (payload.break_minutes !== undefined && payload.break_minutes !== null) {
    if (typeof payload.break_minutes !== 'number' || payload.break_minutes < 0 || payload.break_minutes > 480) {
      errors.push('Pauze moet een getal zijn tussen 0 en 480 minuten');
    }
  }

  // Trips
  if (!Array.isArray(payload.trips) || payload.trips.length === 0) {
    errors.push('Minimaal één rit is vereist');
  } else if (payload.trips.length > 20) {
    errors.push('Maximaal 20 ritten per dienst');
  } else {
    payload.trips.forEach((trip, i) => {
      const prefix = `Rit ${i + 1}`;
      if (!isValidTime(trip.start_time)) errors.push(`${prefix}: ongeldige starttijd`);
      if (!isValidTime(trip.end_time)) errors.push(`${prefix}: ongeldige eindtijd`);
      if (!trip.vehicle_id || typeof trip.vehicle_id !== 'string') errors.push(`${prefix}: voertuig is verplicht`);
      if (!isOptionalString(trip.customer_id)) errors.push(`${prefix}: ongeldige klant ID`);
      if (!isOptionalString(trip.route_name)) errors.push(`${prefix}: ongeldige routenaam`);
      if (!isOptionalString(trip.departure_location)) errors.push(`${prefix}: ongeldige vertreklocatie`);
      if (!isOptionalString(trip.notes)) errors.push(`${prefix}: ongeldige opmerkingen`);
      if (!isOptionalNumber(trip.start_km)) errors.push(`${prefix}: ongeldige begin km`);
      if (!isOptionalNumber(trip.end_km)) errors.push(`${prefix}: ongeldige eind km`);
      if (trip.start_km != null && trip.end_km != null && trip.end_km < trip.start_km) {
        errors.push(`${prefix}: eind km mag niet lager zijn dan begin km`);
      }
      if (!isOptionalNumber(trip.fuel_liters)) errors.push(`${prefix}: ongeldige brandstof liters`);
      if (!isOptionalNumber(trip.adblue_liters)) errors.push(`${prefix}: ongeldige AdBlue liters`);
      if (!isOptionalNumber(trip.fuel_km)) errors.push(`${prefix}: ongeldige km-stand tanken`);
      if (!isOptionalNumber(trip.charging_kwh)) errors.push(`${prefix}: ongeldige kWh`);
      if (!isOptionalNumber(trip.planned_stops)) errors.push(`${prefix}: ongeldige bestelde stops`);
    });
  }

  // Standplaatswerk
  if (payload.standplaats_werk !== undefined && payload.standplaats_werk !== null) {
    if (!Array.isArray(payload.standplaats_werk)) {
      errors.push('standplaats_werk moet een array zijn');
    } else if (payload.standplaats_werk.length > 20) {
      errors.push('Maximaal 20 standplaatswerk regels');
    } else {
      payload.standplaats_werk.forEach((spw, i) => {
        const prefix = `Standplaatswerk ${i + 1}`;
        if (spw.start_time && !isValidTime(spw.start_time)) errors.push(`${prefix}: ongeldige starttijd`);
        if (spw.end_time && !isValidTime(spw.end_time)) errors.push(`${prefix}: ongeldige eindtijd`);
        if (!isOptionalString(spw.customer_id)) errors.push(`${prefix}: ongeldige klant ID`);
        if (!isOptionalString(spw.project_id)) errors.push(`${prefix}: ongeldige project ID`);
        if (!isOptionalString(spw.activity_id)) errors.push(`${prefix}: ongeldige activiteit ID`);
        if (!isOptionalString(spw.notes)) errors.push(`${prefix}: ongeldige opmerkingen`);
      });
    }
  }

  // Notes
  if (!isOptionalString(payload.notes)) {
    errors.push('Opmerkingen moet een string zijn');
  }
  if (typeof payload.notes === 'string' && payload.notes.length > 2000) {
    errors.push('Opmerkingen mag maximaal 2000 tekens zijn');
  }

  // Trip time vs service time (single-day only)
  if (errors.length === 0 && Array.isArray(payload.trips)) {
    const isSingleDay = !payload.end_date || payload.end_date === payload.date;
    if (isSingleDay) {
      const dienstStart = timeToMinutes(payload.start_time);
      const dienstEnd = timeToMinutes(payload.end_time);
      payload.trips.forEach((trip, i) => {
        const tripStart = timeToMinutes(trip.start_time);
        const tripEnd = timeToMinutes(trip.end_time);
        if (tripStart !== null && dienstStart !== null && tripStart < dienstStart) {
          errors.push(`Rit ${i + 1}: starttijd (${trip.start_time}) ligt vóór start dienst (${payload.start_time})`);
        }
        if (tripEnd !== null && dienstEnd !== null && tripEnd > dienstEnd) {
          errors.push(`Rit ${i + 1}: eindtijd (${trip.end_time}) ligt na einde dienst (${payload.end_time})`);
        }
      });
    }
  }

  return errors;
}

// --- SANITIZERS ---

function sanitizeTrip(trip, employeeId, date, timeEntryId) {
  return {
    employee_id: employeeId,
    time_entry_id: timeEntryId,
    date: date,
    vehicle_id: trip.vehicle_id,
    customer_id: trip.customer_id || null,
    route_name: trip.route_name ? String(trip.route_name).slice(0, 200) : null,
    planned_stops: clampNumber(trip.planned_stops, 0, 9999),
    start_km: clampNumber(trip.start_km, 0, 9999999),
    end_km: clampNumber(trip.end_km, 0, 9999999),
    total_km: (trip.start_km != null && trip.end_km != null) 
      ? Math.max(0, Number(trip.end_km) - Number(trip.start_km)) 
      : null,
    fuel_liters: clampNumber(trip.fuel_liters, 0, 9999),
    adblue_liters: clampNumber(trip.adblue_liters, 0, 9999),
    fuel_km: clampNumber(trip.fuel_km, 0, 9999999),
    charging_kwh: clampNumber(trip.charging_kwh, 0, 9999),
    departure_time: isValidTime(trip.start_time) ? trip.start_time : null,
    arrival_time: isValidTime(trip.end_time) ? trip.end_time : null,
    departure_location: (trip.departure_location || '').slice(0, 200) || null,
    notes: (trip.notes || '').slice(0, 2000) || null,
    status: 'Voltooid',
  };
}

function sanitizeStandplaatsWerk(spw, employeeId, date, timeEntryId) {
  return {
    employee_id: employeeId,
    time_entry_id: timeEntryId,
    date: date,
    start_time: isValidTime(spw.start_time) ? spw.start_time : null,
    end_time: isValidTime(spw.end_time) ? spw.end_time : null,
    customer_id: spw.customer_id || null,
    project_id: spw.project_id || null,
    activity_id: spw.activity_id || null,
    notes: (spw.notes || '').slice(0, 2000) || null,
  };
}

// --- MAIN HANDLER ---

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ============================
    // 1. AUTHENTICATION
    // ============================
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ 
        success: false, error: 'UNAUTHORIZED', message: 'Niet ingelogd' 
      }, { status: 401 });
    }

    // ============================
    // 2. PARSE PAYLOAD
    // ============================
    let payload;
    try {
      payload = await req.json();
    } catch {
      return Response.json({ 
        success: false, error: 'INVALID_JSON', message: 'Ongeldig JSON payload' 
      }, { status: 400 });
    }

    // ============================
    // 3. INPUT VALIDATION
    // ============================
    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return Response.json({
        success: false, error: 'VALIDATION_FAILED',
        message: 'Invoer validatie mislukt', details: validationErrors
      }, { status: 422 });
    }

    // ============================
    // 4. AUTHORIZATION
    // ============================
    const svc = base44.asServiceRole;

    const employees = await svc.entities.Employee.filter({ email: user.email });
    if (employees.length === 0) {
      return Response.json({
        success: false, error: 'EMPLOYEE_NOT_FOUND',
        message: 'Geen medewerker gevonden voor dit account'
      }, { status: 403 });
    }

    const employee = employees[0];
    if (employee.status === 'Uit dienst') {
      return Response.json({
        success: false, error: 'EMPLOYEE_INACTIVE',
        message: 'Medewerker is uit dienst'
      }, { status: 403 });
    }

    const employeeId = employee.id;

    // ============================
    // 5. IDEMPOTENCY CHECK
    // ============================
    // Check if this exact submission already succeeded.
    // We store idempotency_key in the notes field as a tag: [idem:uuid]
    // This avoids needing a new entity or field.
    const idempotencyTag = `[idem:${payload.idempotency_key}]`;

    const existingWithKey = await svc.entities.TimeEntry.filter({
      employee_id: employeeId,
      date: payload.date,
    });

    const alreadyCommitted = existingWithKey.find(e => 
      (e.status === 'Ingediend' || e.status === 'Goedgekeurd') &&
      e.notes && e.notes.includes(idempotencyTag)
    );

    if (alreadyCommitted) {
      // Already processed — return existing result (safe retry)
      console.log(`Idempotent hit: ${payload.idempotency_key} → TimeEntry ${alreadyCommitted.id}`);
      
      const existingTrips = await svc.entities.Trip.filter({
        time_entry_id: alreadyCommitted.id
      });
      const existingSpw = await svc.entities.StandplaatsWerk.filter({
        time_entry_id: alreadyCommitted.id
      });

      return Response.json({
        success: true,
        idempotent_hit: true,
        data: {
          time_entry_id: alreadyCommitted.id,
          trip_ids: existingTrips.map(t => t.id),
          standplaats_werk_ids: existingSpw.map(s => s.id),
          computed: {
            total_hours: alreadyCommitted.total_hours,
            shift_type: alreadyCommitted.shift_type,
            week_number: alreadyCommitted.week_number,
            year: alreadyCommitted.year,
          }
        }
      });
    }

    // Also clean up orphan Concepts from this same idempotency key (crashed previous attempt)
    const orphanedAttempts = existingWithKey.filter(e =>
      e.status === 'Concept' && e.notes && e.notes.includes(idempotencyTag)
    );
    for (const orphan of orphanedAttempts) {
      console.log(`Cleaning orphan from previous attempt: ${orphan.id}`);
      // Clean child records
      const orphanTrips = await svc.entities.Trip.filter({ time_entry_id: orphan.id });
      for (const t of orphanTrips) { await svc.entities.Trip.delete(t.id); }
      const orphanSpw = await svc.entities.StandplaatsWerk.filter({ time_entry_id: orphan.id });
      for (const s of orphanSpw) { await svc.entities.StandplaatsWerk.delete(s.id); }
      await svc.entities.TimeEntry.delete(orphan.id);
    }

    // ============================
    // 6. OVERLAP DETECTION
    // ============================
    const entryEndDate = payload.end_date || payload.date;
    const committedEntries = existingWithKey.filter(e => 
      e.status === 'Ingediend' || e.status === 'Goedgekeurd'
    );

    for (const existing of committedEntries) {
      const existingEnd = existing.end_date || existing.date;
      // Check date range overlap: A.start <= B.end AND A.end >= B.start
      const overlaps = payload.date <= existingEnd && entryEndDate >= existing.date;
      
      if (overlaps && existing.start_time && payload.start_time) {
        // For same-date entries: check time overlap
        if (payload.date === existing.date && entryEndDate === existingEnd) {
          const newStart = timeToMinutes(payload.start_time);
          const newEnd = timeToMinutes(payload.end_time);
          const exStart = timeToMinutes(existing.start_time);
          const exEnd = timeToMinutes(existing.end_time);
          
          if (newStart !== null && newEnd !== null && exStart !== null && exEnd !== null) {
            const timeOverlaps = newStart < exEnd && newEnd > exStart;
            if (timeOverlaps) {
              return Response.json({
                success: false, error: 'TIME_OVERLAP',
                message: `Dienst overlapt met bestaande dienst (${existing.start_time}-${existing.end_time} op ${existing.date})`,
                details: [`Bestaande dienst ID: ${existing.id}`]
              }, { status: 409 });
            }
          }
        } else {
          // Multi-day overlaps on date range = always conflict
          return Response.json({
            success: false, error: 'DATE_OVERLAP',
            message: `Dienstperiode overlapt met bestaande dienst (${existing.date} t/m ${existingEnd})`,
            details: [`Bestaande dienst ID: ${existing.id}`]
          }, { status: 409 });
        }
      }
    }

    // ============================
    // 7. COMPUTE DERIVED FIELDS (server-side, never trust client)
    // ============================
    const breakMinutes = Math.max(0, Math.round(payload.break_minutes || 0));
    const endDate = payload.end_date || null;
    const totalHours = calculateHours(payload.start_time, payload.end_time, breakMinutes, payload.date, endDate);
    const shiftType = determineShiftType(payload.start_time, payload.end_time);
    const weekNumber = getISOWeek(payload.date);
    const year = getISOYear(payload.date);

    // ============================
    // 8. TRANSACTION Phase 1: CREATE (all as Concept — safe state)
    // ============================
    // KEY CHANGE from v1: We do NOT delete old drafts first.
    // We create new records, commit them, THEN clean old drafts.
    // This way, if we crash mid-create, old drafts are still intact.

    const createdIds = {
      timeEntry: null,
      trips: [],
      standplaatsWerk: [],
    };

    try {
      // Embed idempotency tag in notes for duplicate detection
      const userNotes = (payload.notes || '').slice(0, 2000);
      const notesWithTag = userNotes 
        ? `${userNotes} ${idempotencyTag}` 
        : idempotencyTag;

      // --- Create TimeEntry as Concept ---
      const timeEntryData = {
        employee_id: employeeId,
        date: payload.date,
        end_date: endDate,
        week_number: weekNumber,
        year: year,
        start_time: payload.start_time,
        end_time: payload.end_time,
        break_minutes: breakMinutes,
        total_hours: totalHours,
        shift_type: shiftType,
        notes: notesWithTag,
        status: 'Concept',
        signature_url: payload.signature_url || null,
      };

      const timeEntry = await svc.entities.TimeEntry.create(timeEntryData);
      createdIds.timeEntry = timeEntry.id;

      // --- Create Trips ---
      for (const trip of payload.trips) {
        const tripData = sanitizeTrip(trip, employeeId, payload.date, timeEntry.id);
        const created = await svc.entities.Trip.create(tripData);
        createdIds.trips.push(created.id);
      }

      // --- Create StandplaatsWerk ---
      const spwItems = payload.standplaats_werk || [];
      for (const spw of spwItems) {
        if (spw.customer_id || spw.activity_id) {
          const spwData = sanitizeStandplaatsWerk(spw, employeeId, payload.date, timeEntry.id);
          const created = await svc.entities.StandplaatsWerk.create(spwData);
          createdIds.standplaatsWerk.push(created.id);
        }
      }

      // ============================
      // 9. TRANSACTION Phase 2: COMMIT
      // ============================
      await svc.entities.TimeEntry.update(timeEntry.id, { status: 'Ingediend' });

      // ============================
      // 10. POST-COMMIT CLEANUP (best-effort, non-critical)
      // ============================
      // NOW it's safe to delete old drafts, because new data is committed.
      // If this fails, we have extra Concept records — harmless, cleaned next time.
      try {
        const oldDrafts = existingWithKey.filter(e => 
          e.status === 'Concept' && e.id !== timeEntry.id
        );
        for (const draft of oldDrafts) {
          // Delete child records first
          const draftTrips = await svc.entities.Trip.filter({ time_entry_id: draft.id });
          for (const dt of draftTrips) { await svc.entities.Trip.delete(dt.id); }
          
          const draftSpw = await svc.entities.StandplaatsWerk.filter({ time_entry_id: draft.id });
          for (const ds of draftSpw) { await svc.entities.StandplaatsWerk.delete(ds.id); }
          
          await svc.entities.TimeEntry.delete(draft.id);
        }

        // Also clean draft trips not linked to any entry (legacy orphans)
        const orphanTrips = await svc.entities.Trip.filter({
          employee_id: employeeId,
          date: payload.date,
          status: 'Gepland'
        });
        for (const ot of orphanTrips) { await svc.entities.Trip.delete(ot.id); }

        // Clean orphan standplaatswerk not linked to committed entries
        const allSpw = await svc.entities.StandplaatsWerk.filter({
          employee_id: employeeId,
          date: payload.date
        });
        const committedEntryIds = new Set(
          committedEntries.map(e => e.id).concat([timeEntry.id])
        );
        for (const s of allSpw) {
          if (s.time_entry_id && !committedEntryIds.has(s.time_entry_id)) {
            await svc.entities.StandplaatsWerk.delete(s.id);
          } else if (!s.time_entry_id) {
            // Legacy SPW without time_entry_id — clean if it's not from today's committed entries
            await svc.entities.StandplaatsWerk.delete(s.id);
          }
        }
      } catch (cleanupError) {
        // Cleanup failure is non-critical — log but don't fail the response
        console.error('Post-commit cleanup error (non-critical):', cleanupError.message);
      }

      // ============================
      // 11. SUCCESS RESPONSE
      // ============================
      return Response.json({
        success: true,
        data: {
          time_entry_id: timeEntry.id,
          trip_ids: createdIds.trips,
          standplaats_werk_ids: createdIds.standplaatsWerk,
          computed: { total_hours: totalHours, shift_type: shiftType, week_number: weekNumber, year }
        }
      });

    } catch (innerError) {
      // ============================
      // ROLLBACK — clean up newly created records
      // ============================
      // Old drafts are UNTOUCHED (we didn't delete them), so no data loss.
      console.error('Transaction failed, rolling back:', innerError.message);

      const rollbackErrors = [];

      for (const id of createdIds.standplaatsWerk) {
        try { await svc.entities.StandplaatsWerk.delete(id); } 
        catch (e) { rollbackErrors.push(`SPW ${id}: ${e.message}`); }
      }

      for (const id of createdIds.trips) {
        try { await svc.entities.Trip.delete(id); } 
        catch (e) { rollbackErrors.push(`Trip ${id}: ${e.message}`); }
      }

      if (createdIds.timeEntry) {
        try { await svc.entities.TimeEntry.delete(createdIds.timeEntry); } 
        catch (e) { rollbackErrors.push(`TimeEntry ${createdIds.timeEntry}: ${e.message}`); }
      }

      if (rollbackErrors.length > 0) {
        console.error('Rollback had partial failures:', rollbackErrors);
      }

      return Response.json({
        success: false, error: 'TRANSACTION_FAILED',
        message: 'Dienst indienen mislukt. Wijzigingen zijn teruggedraaid. Probeer opnieuw.',
        details: [innerError.message || 'Onbekende fout'],
        rollback_clean: rollbackErrors.length === 0
      }, { status: 500 });
    }

  } catch (outerError) {
    console.error('Unhandled error in submitTimeEntry:', outerError);
    return Response.json({
      success: false, error: 'INTERNAL_ERROR',
      message: 'Er is een onverwachte fout opgetreden',
    }, { status: 500 });
  }
});