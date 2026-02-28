// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM / ADMIN                                  ║
// ║ Called by: scheduled automation (monthly) or admin manual      ║
// ║ Auth: User session (admin)                                     ║
// ║ Purpose: Archive PostNLImportResult records older than cutoff  ║
// ║          to PostNLImportArchive, then delete originals.        ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { cutoff_date } = await req.json();
    if (!cutoff_date) {
      return Response.json({ error: 'cutoff_date is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const svc = base44.asServiceRole;
    console.log(`[archivePostNL] Starting archive for records with import_datum < ${cutoff_date}`);

    // Fetch old records in batches
    let totalArchived = 0;
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await svc.entities.PostNLImportResult.filter(
        { import_datum: { $lt: cutoff_date } },
        'import_datum',
        100
      );

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`[archivePostNL] Processing batch of ${batch.length} records`);

      // Normalize datum to ISO format
      function normalizeDatum(d) {
        if (!d) return null;
        if (d.length === 10 && d[4] === '-') return d; // Already YYYY-MM-DD
        if (d.length === 10 && d[2] === '-') {
          const parts = d.split('-');
          return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY → YYYY-MM-DD
        }
        return d;
      }

      // Copy to archive
      const archiveRecords = batch.map(r => ({
        original_id: r.id,
        original_created_date: r.created_date,
        project_id: r.project_id,
        project_naam: r.project_naam || '',
        klant_naam: r.klant_naam,
        ritnaam: r.ritnaam || '',
        datum: normalizeDatum(r.datum) || '',
        starttijd_shift: r.starttijd_shift || '',
        import_datum: r.import_datum,
        bestandsnaam: r.bestandsnaam,
        data: r.data,
        archived_at: new Date().toISOString(),
      }));

      // Bulk create in archive (max 50 at a time for API limits)
      for (let i = 0; i < archiveRecords.length; i += 50) {
        const chunk = archiveRecords.slice(i, i + 50);
        await svc.entities.PostNLImportArchive.bulkCreate(chunk);
        totalArchived += chunk.length;
      }

      // Delete originals
      for (const r of batch) {
        await svc.entities.PostNLImportResult.delete(r.id);
        totalDeleted++;
      }

      console.log(`[archivePostNL] Batch done. Archived: ${totalArchived}, Deleted: ${totalDeleted}`);

      // Safety: if batch was less than 100, we're done
      if (batch.length < 100) {
        hasMore = false;
      }
    }

    // Log to AuditLog
    try {
      await svc.entities.AuditLog.create({
        action_type: 'export',
        category: 'Data',
        description: `PostNL Import archivering: ${totalArchived} records gearchiveerd (cutoff: ${cutoff_date})`,
        performed_by_email: user.email,
        performed_by_name: user.full_name || user.email,
        performed_by_role: user.role,
        metadata: {
          cutoff_date,
          archived_count: totalArchived,
          deleted_count: totalDeleted,
        },
      });
    } catch (auditErr) {
      console.warn('[archivePostNL] Audit log failed:', auditErr?.message);
    }

    console.log(`[archivePostNL] Done. Total archived: ${totalArchived}, deleted: ${totalDeleted}`);

    return Response.json({
      success: true,
      cutoff_date,
      archived: totalArchived,
      deleted: totalDeleted,
    });
  } catch (error) {
    console.error('[archiveOldPostNLImports]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});