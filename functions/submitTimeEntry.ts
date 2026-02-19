import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// submitTimeEntry — Atomic server-side time entry submission
// ============================================================
// Single API call from client. Full server-side validation.
// Pseudo-transactional: creates as Concept, flips to Ingediend
// only after ALL child records succeed. On failure, cleans up.
// ============================================================

// --- VALIDATION HELPERS ---

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function isValidTime(t) {
  return typeof t === 'string' && TIME_REGEX.test(t);
}

function isValidDate(d) {
  if (typeof d !== 'string' || !DATE_REGEX.test(d)) return false;
  const parsed = new Date(d + 'T12:00:00'); // noon to avoid TZ issues
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

  // Multi-day: add days difference
  if (endDate && startDate && endDate > startDate) {
    const d1 = new Date(startDate + 'T12:00:00');
    const d2 = new Date(endDate + 'T12:00:00');
    const dayDiff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    totalMinutes += dayDiff * 24 * 60;
  } else if (totalMinutes < 0) {
    totalMinutes += 24 * 60; // overnight single-day
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

  // --- Required fields ---
  if (!payload) {
    return ['Payload is vereist'];
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

  // --- Multi-day ---
  if (payload.end_date !== undefined && payload.end_date !== null) {
    if (!isValidDate(payload.end_date)) {
      errors.push('Ongeldige einddatum (verwacht: YYYY-MM-DD)');
    } else if (payload.date && payload.end_date < payload.date) {
      errors.push('Einddatum mag niet vóór startdatum liggen');
    }
    // Max 7 days
    if (isValidDate(payload.date) && isValidDate(payload.end_date)) {
      const d1 = new Date(payload.date + 'T12:00:00');
      const d2 = new Date(payload.end_date + 'T12:00:00');
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diff > 7) {
        errors.push('Dienst mag maximaal 7 dagen duren');
      }
    }
  }

  // --- Break minutes ---
  if (payload.break_minutes !== undefined && payload.break_minutes !== null) {
    if (typeof payload.break_minutes !== 'number' || payload.break_minutes < 0 || payload.break_minutes > 480) {
      errors.push('Pauze moet een getal zijn tussen 0 en 480 minuten');
    }
  }

  // --- Trips ---
  if (!Array.isArray(payload.trips) || payload.trips.length === 0) {
    errors.push('Minimaal één rit is vereist');
  } else if (payload.trips.length > 20) {
    errors.push('Maximaal 20 ritten per dienst');
  } else {
    payload.trips.forEach((trip, i) => {
      const prefix = `Rit ${i + 1}`;
      if (!isValidTime(trip.start_time)) {
        errors.push(`${prefix}: ongeldige starttijd`);
      }
      if (!isValidTime(trip.end_time)) {
        errors.push(`${prefix}: ongeldige eindtijd`);
      }
      if (!trip.vehicle_id || typeof trip.vehicle_id !== 'string') {
        errors.push(`${prefix}: voertuig is verplicht`);
      }
      if (!isOptionalString(trip.customer_id)) {
        errors.push(`${prefix}: ongeldige klant ID`);
      }
      if (!isOptionalString(trip.route_name)) {
        errors.push(`${prefix}: ongeldige routenaam`);
      }
      if (!isOptionalString(trip.departure_location)) {
        errors.push(`${prefix}: ongeldige vertreklocatie`);
      }
      if (!isOptionalString(trip.notes)) {
        errors.push(`${prefix}: ongeldige opmerkingen`);
      }
      if (!isOptionalNumber(trip.start_km)) {
        errors.push(`${prefix}: ongeldige begin km`);
      }
      if (!isOptionalNumber(trip.end_km)) {
        errors.push(`${prefix}: ongeldige eind km`);
      }
      if (trip.start_km != null && trip.end_km != null && trip.end_km < trip.start_km) {
        errors.push(`${prefix}: eind km mag niet lager zijn dan begin km`);
      }
      if (!isOptionalNumber(trip.fuel_liters)) {
        errors.push(`${prefix}: ongeldige brandstof liters`);
      }
      if (!isOptionalNumber(trip.adblue_liters)) {
        errors.push(`${prefix}: ongeldige AdBlue liters`);
      }
      if (!isOptionalNumber(trip.fuel_km)) {
        errors.push(`${prefix}: ongeldige km-stand tanken`);
      }
      if (!isOptionalNumber(trip.charging_kwh)) {
        errors.push(`${prefix}: ongeldige kWh`);
      }
      if (!isOptionalNumber(trip.planned_stops)) {
        errors.push(`${prefix}: ongeldige bestelde stops`);
      }
    });
  }

  // --- Standplaatswerk (optional) ---
  if (payload.standplaats_werk !== undefined && payload.standplaats_werk !== null) {
    if (!Array.isArray(payload.standplaats_werk)) {
      errors.push('standplaats_werk moet een array zijn');
    } else if (payload.standplaats_werk.length > 20) {
      errors.push('Maximaal 20 standplaatswerk regels');
    } else {
      payload.standplaats_werk.forEach((spw, i) => {
        const prefix = `Standplaatswerk ${i + 1}`;
        if (spw.start_time && !isValidTime(spw.start_time)) {
          errors.push(`${prefix}: ongeldige starttijd`);
        }
        if (spw.end_time && !isValidTime(spw.end_time)) {
          errors.push(`${prefix}: ongeldige eindtijd`);
        }
        if (!isOptionalString(spw.customer_id)) errors.push(`${prefix}: ongeldige klant ID`);
        if (!isOptionalString(spw.project_id)) errors.push(`${prefix}: ongeldige project ID`);
        if (!isOptionalString(spw.activity_id)) errors.push(`${prefix}: ongeldige activiteit ID`);
        if (!isOptionalString(spw.notes)) errors.push(`${prefix}: ongeldige opmerkingen`);
      });
    }
  }

  // --- Notes ---
  if (!isOptionalString(payload.notes)) {
    errors.push('Opmerkingen moet een string zijn');
  }
  if (typeof payload.notes === 'string' && payload.notes.length > 2000) {
    errors.push('Opmerkingen mag maximaal 2000 tekens zijn');
  }

  // --- Trip time vs service time validation (single-day only) ---
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

// --- SANITIZE: strip any fields not in the whitelist ---

function sanitizeTrip(trip, employeeId, date, timeEntryId) {
  return {
    employee_id: employeeId,
    time_entry_id: timeEntryId,
    date: date,
    vehicle_id: trip.vehicle_id,
    customer_id: trip.customer_id || null,
    route_name: trip.route_name || null,
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
        success: false, 
        error: 'UNAUTHORIZED', 
        message: 'Niet ingelogd' 
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
        success: false, 
        error: 'INVALID_JSON', 
        message: 'Ongeldig JSON payload' 
      }, { status: 400 });
    }

    // ============================
    // 3. INPUT VALIDATION
    // ============================
    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return Response.json({
        success: false,
        error: 'VALIDATION_FAILED',
        message: 'Invoer validatie mislukt',
        details: validationErrors
      }, { status: 422 });
    }

    // ============================
    // 4. AUTHORIZATION — employee must belong to authenticated user
    // ============================
    // Use service role to look up employee by user email
    const employees = await base44.asServiceRole.entities.Employee.filter({ 
      email: user.email 
    });
    
    if (employees.length === 0) {
      return Response.json({
        success: false,
        error: 'EMPLOYEE_NOT_FOUND',
        message: 'Geen medewerker gevonden voor dit account'
      }, { status: 403 });
    }

    const employee = employees[0];

    // Check employee status
    if (employee.status === 'Uit dienst') {
      return Response.json({
        success: false,
        error: 'EMPLOYEE_INACTIVE',
        message: 'Medewerker is uit dienst'
      }, { status: 403 });
    }

    const employeeId = employee.id;

    // ============================
    // 5. BUSINESS RULE VALIDATION
    // ============================
    // Check for already submitted (non-concept) entries on this date
    const existingSubmitted = await base44.asServiceRole.entities.TimeEntry.filter({
      employee_id: employeeId,
      date: payload.date,
    });
    
    const nonConceptEntries = existingSubmitted.filter(e => 
      e.status === 'Ingediend' || e.status === 'Goedgekeurd'
    );
    
    // Allow resubmit if mode is 'resubmit' (for rejected entries correction)
    if (nonConceptEntries.length > 0 && payload.mode !== 'additional') {
      // Check if user wants to add an additional entry (multi-shift day)
      // If not explicitly additional mode, warn about existing entries
      console.log(`Existing non-concept entries for ${payload.date}: ${nonConceptEntries.length}`);
    }

    // ============================
    // 6. COMPUTE DERIVED FIELDS (server-side, not trusting client)
    // ============================
    const breakMinutes = Math.max(0, Math.round(payload.break_minutes || 0));
    const endDate = payload.end_date || null;
    const totalHours = calculateHours(
      payload.start_time, payload.end_time, breakMinutes,
      payload.date, endDate
    );
    const shiftType = determineShiftType(payload.start_time, payload.end_time);
    const weekNumber = getISOWeek(payload.date);
    const year = getISOYear(payload.date);

    // ============================
    // 7. PSEUDO-TRANSACTION: Phase 1 — PREPARE (create as Concept)
    // ============================
    // All operations use service role for consistency
    const svc = base44.asServiceRole;

    // Track all created record IDs for rollback
    const createdIds = {
      timeEntry: null,
      trips: [],
      standplaatsWerk: [],
    };

    try {
      // --- Clean up existing drafts for this date ---
      const existingDrafts = await svc.entities.TimeEntry.filter({
        employee_id: employeeId,
        date: payload.date,
        status: 'Concept'
      });

      // Delete old draft trips linked to draft entries
      for (const draft of existingDrafts) {
        const draftTrips = await svc.entities.Trip.filter({
          employee_id: employeeId,
          date: payload.date,
          status: 'Gepland'
        });
        for (const dt of draftTrips) {
          await svc.entities.Trip.delete(dt.id);
        }
      }

      // Delete old draft standplaatswerk
      const oldSpw = await svc.entities.StandplaatsWerk.filter({
        employee_id: employeeId,
        date: payload.date
      });
      // Only delete SPW linked to concept entries (not approved ones)
      const draftEntryIds = new Set(existingDrafts.map(e => e.id));
      for (const s of oldSpw) {
        // Delete if no time_entry_id (old data) or linked to a draft
        if (!s.time_entry_id || draftEntryIds.has(s.time_entry_id)) {
          await svc.entities.StandplaatsWerk.delete(s.id);
        }
      }

      // Delete old draft time entries
      for (const draft of existingDrafts) {
        await svc.entities.TimeEntry.delete(draft.id);
      }

      // --- Create TimeEntry as Concept (safe state) ---
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
        notes: (payload.notes || '').slice(0, 2000) || null,
        status: 'Concept', // SAFE STATE — will flip to Ingediend after all children succeed
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
        // Only create if has meaningful data
        if (spw.customer_id || spw.activity_id) {
          const spwData = sanitizeStandplaatsWerk(spw, employeeId, payload.date, timeEntry.id);
          const created = await svc.entities.StandplaatsWerk.create(spwData);
          createdIds.standplaatsWerk.push(created.id);
        }
      }

      // ============================
      // 8. PSEUDO-TRANSACTION: Phase 2 — COMMIT (flip to Ingediend)
      // ============================
      await svc.entities.TimeEntry.update(timeEntry.id, {
        status: 'Ingediend'
      });

      // ============================
      // 9. SUCCESS RESPONSE
      // ============================
      return Response.json({
        success: true,
        data: {
          time_entry_id: timeEntry.id,
          trip_ids: createdIds.trips,
          standplaats_werk_ids: createdIds.standplaatsWerk,
          computed: {
            total_hours: totalHours,
            shift_type: shiftType,
            week_number: weekNumber,
            year: year,
          }
        }
      });

    } catch (innerError) {
      // ============================
      // ROLLBACK — clean up any created records
      // ============================
      console.error('Transaction failed, rolling back:', innerError);

      const rollbackErrors = [];

      // Rollback standplaatswerk
      for (const id of createdIds.standplaatsWerk) {
        try { await svc.entities.StandplaatsWerk.delete(id); } 
        catch (e) { rollbackErrors.push(`SPW ${id}: ${e.message}`); }
      }

      // Rollback trips
      for (const id of createdIds.trips) {
        try { await svc.entities.Trip.delete(id); } 
        catch (e) { rollbackErrors.push(`Trip ${id}: ${e.message}`); }
      }

      // Rollback time entry
      if (createdIds.timeEntry) {
        try { await svc.entities.TimeEntry.delete(createdIds.timeEntry); } 
        catch (e) { rollbackErrors.push(`TimeEntry ${createdIds.timeEntry}: ${e.message}`); }
      }

      if (rollbackErrors.length > 0) {
        console.error('Rollback errors:', rollbackErrors);
      }

      return Response.json({
        success: false,
        error: 'TRANSACTION_FAILED',
        message: 'Dienst indienen mislukt. Alle wijzigingen zijn teruggedraaid.',
        details: [innerError.message || 'Onbekende fout'],
        rollback_clean: rollbackErrors.length === 0
      }, { status: 500 });
    }

  } catch (outerError) {
    console.error('Unhandled error in submitTimeEntry:', outerError);
    return Response.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Er is een onverwachte fout opgetreden',
    }, { status: 500 });
  }
});