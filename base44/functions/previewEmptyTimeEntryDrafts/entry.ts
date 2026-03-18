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

    const preview = emptyDrafts.map(e => {
      const isEmpty =
        !e.start_time &&
        !e.end_time &&
        !e.total_hours &&
        !e.project_id &&
        !e.departure_location &&
        !e.return_location &&
        !e.notes;

      return {
        id: e.id,
        employee_id: e.employee_id,
        date: e.date,
        start_time: e.start_time || null,
        end_time: e.end_time || null,
        total_hours: e.total_hours || null,
        project_id: e.project_id || null,
        departure_location: e.departure_location || null,
        return_location: e.return_location || null,
        notes: e.notes || null,
        created_date: e.created_date,
        empty_status: isEmpty ? "EMPTY" : "PARTIAL"
      };
    });

    preview.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    return Response.json({
      success: true,
      count: preview.length,
      entries: preview
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error?.message || "Preview fout"
    }, { status: 500 });
  }
});