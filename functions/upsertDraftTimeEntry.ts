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
      // 3. Geen bestaande entry → maak nieuw aan
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});