// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Employee via mobile app (auto-save draft)             ║
// ║ Auth: User session (any authenticated employee)                  ║
// ║ v3 — re-deployed 2026-03-01                                     ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { employee_id, date } = payload;

    if (!employee_id || !date) {
      return Response.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'employee_id en date zijn verplicht' },
        { status: 422 }
      );
    }

    const svc = base44.asServiceRole;

    // Employee status check: alleen actieve medewerkers mogen drafts opslaan
    let employee;
    try {
      employee = await svc.entities.Employee.get(employee_id);
    } catch (e) {
      return Response.json({ success: false, error: 'EMPLOYEE_NOT_FOUND', message: 'Medewerker niet gevonden' }, { status: 404 });
    }
    if (!employee) {
      return Response.json({ success: false, error: 'EMPLOYEE_NOT_FOUND', message: 'Medewerker niet gevonden' }, { status: 404 });
    }
    if (employee.out_of_service_date) {
      const exitDate = new Date(employee.out_of_service_date);
      exitDate.setHours(0, 0, 0, 0);
      const graceEnd = new Date(exitDate);
      graceEnd.setDate(graceEnd.getDate() + 7);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (today > graceEnd) {
        return Response.json({ success: false, error: 'EMPLOYEE_INACTIVE', message: 'Je dienstverband is beëindigd en de grace-periode is verlopen.' }, { status: 403 });
      }
    }

    // 1. Zoek alle bestaande Concept entries voor employee_id + date
    const existing = await svc.entities.TimeEntry.filter({
      employee_id,
      date,
      status: 'Concept',
    });

    console.log(`[upsertDraft] Found ${existing.length} Concept entries for employee=${employee_id} date=${date}`);

    // Build the payload to save (strip meta fields)
    const { ...entryData } = payload;

    let resultId;

    if (existing.length > 0) {
      // 2a. Update de eerste (oudste) entry
      const primary = existing[0];
      resultId = primary.id;
      await svc.entities.TimeEntry.update(primary.id, entryData);
      console.log(`[upsertDraft] Updated existing entry ${primary.id}`);

      // 2b. Verwijder eventuele duplicates (entry 1..n)
      for (let i = 1; i < existing.length; i++) {
        try {
          await svc.entities.TimeEntry.delete(existing[i].id);
          console.log(`[upsertDraft] Deleted duplicate entry ${existing[i].id}`);
        } catch (e) {
          console.error(`[upsertDraft] Failed to delete duplicate ${existing[i].id}: ${e?.message}`);
        }
      }
    } else {
      // 3. Geen bestaande entry → alleen aanmaken als er inhoudelijke data is
      const hasContent = entryData.start_time || entryData.end_time;
      if (!hasContent) {
        console.log(`[upsertDraft] Skipped creation — no start_time or end_time for employee=${employee_id} date=${date}`);
        return Response.json({ success: true, id: null, skipped: true });
      }
      const created = await svc.entities.TimeEntry.create({
        ...entryData,
        status: 'Concept',
      });
      resultId = created.id;
      console.log(`[upsertDraft] Created new draft entry ${resultId}`);
    }

    return Response.json({ success: true, id: resultId });
  } catch (error) {
    console.error('[upsertDraft] Error:', error?.message);
    return Response.json({ success: false, error: error.message || 'Onbekende fout' }, { status: 500 });
  }
});