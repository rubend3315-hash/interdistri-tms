import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== 'admin' && user.business_role !== 'OPERATIONS_MANAGER') {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const svc = base44.asServiceRole;
    const drafts = await svc.entities.TimeEntry.filter({ status: "Concept" });

    const isEmptyDraft = (e) =>
      !e.start_time &&
      !e.end_time &&
      !e.total_hours &&
      !e.project_id &&
      !e.departure_location &&
      !e.return_location &&
      !e.notes;

    const emptyDrafts = drafts.filter(isEmptyDraft);

    let deleted = 0;
    for (const entry of emptyDrafts) {
      await svc.entities.TimeEntry.delete(entry.id);
      deleted++;
    }

    return Response.json({
      success: true,
      deleted_count: deleted
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error?.message || "Cleanup fout"
    }, { status: 500 });
  }
});