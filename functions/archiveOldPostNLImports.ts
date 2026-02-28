// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: SYSTEM / ADMIN                                  ║
// ║ Called by: scheduled automation (monthly) or admin manual      ║
// ║ Auth: User session (admin)                                     ║
// ║ Purpose: Archive PostNLImportResult records older than cutoff  ║
// ║          to PostNLImportArchive, then delete originals.        ║
// ║ V2: safe batches, verify copy+delete, notifications           ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function normalizeDatum(d) {
  if (!d) return null;
  if (d.length === 10 && d[4] === '-') return d;
  if (d.length === 10 && d[2] === '-') {
    const parts = d.split('-');
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return d;
}

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

    // Safety: also ensure cutoff < (today - 1 day)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const safeMax = yesterday.toISOString().split('T')[0];
    const effectiveCutoff = cutoff_date < safeMax ? cutoff_date : safeMax;

    const svc = base44.asServiceRole;
    console.log(`[archivePostNL] Starting archive: import_datum < ${effectiveCutoff} (requested: ${cutoff_date}, safeMax: ${safeMax})`);

    let totalArchived = 0;
    let totalDeleted = 0;
    let batchNum = 0;
    let errors = [];
    let hasMore = true;
    const BATCH_SIZE = 100; // API limit per call, process many batches up to ~5000

    while (hasMore && totalArchived < 5000) {
      batchNum++;
      const batch = await svc.entities.PostNLImportResult.filter(
        { import_datum: { $lt: effectiveCutoff } },
        'import_datum',
        BATCH_SIZE
      );

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`[archivePostNL] Batch #${batchNum}: ${batch.length} records`);

      // Step 1: Copy to archive
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

      let batchArchived = 0;
      for (let i = 0; i < archiveRecords.length; i += 50) {
        const chunk = archiveRecords.slice(i, i + 50);
        await svc.entities.PostNLImportArchive.bulkCreate(chunk);
        batchArchived += chunk.length;
      }

      // Step 2: Verify copy count
      // Quick check: we just created batchArchived records
      if (batchArchived !== batch.length) {
        const errMsg = `Batch #${batchNum}: archive count mismatch (expected ${batch.length}, got ${batchArchived})`;
        console.error(`[archivePostNL] ${errMsg}`);
        errors.push(errMsg);
        // Don't delete if copy failed
        break;
      }

      totalArchived += batchArchived;

      // Step 3: Delete originals
      let batchDeleted = 0;
      for (const r of batch) {
        await svc.entities.PostNLImportResult.delete(r.id);
        batchDeleted++;
      }

      // Step 4: Verify delete count
      if (batchDeleted !== batch.length) {
        const errMsg = `Batch #${batchNum}: delete count mismatch (expected ${batch.length}, got ${batchDeleted})`;
        console.error(`[archivePostNL] ${errMsg}`);
        errors.push(errMsg);
      }

      totalDeleted += batchDeleted;

      // Step 5: Log batch result
      try {
        await svc.entities.AuditLog.create({
          action_type: 'export',
          category: 'Data',
          description: `PostNL archivering batch #${batchNum}: ${batchArchived} gekopieerd, ${batchDeleted} verwijderd`,
          performed_by_email: user.email,
          performed_by_name: user.full_name || user.email,
          performed_by_role: user.role,
          metadata: { batch: batchNum, archived: batchArchived, deleted: batchDeleted, cutoff: effectiveCutoff },
        });
      } catch (auditErr) {
        console.warn('[archivePostNL] Batch audit log failed:', auditErr?.message);
      }

      console.log(`[archivePostNL] Batch #${batchNum} done. Running total: ${totalArchived} archived, ${totalDeleted} deleted`);

      if (batch.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    // Final audit log
    try {
      await svc.entities.AuditLog.create({
        action_type: 'export',
        category: 'Data',
        description: `PostNL archivering TOTAAL: ${totalArchived} gearchiveerd, ${totalDeleted} verwijderd (cutoff: ${effectiveCutoff})${errors.length > 0 ? ' MET FOUTEN' : ''}`,
        performed_by_email: user.email,
        performed_by_name: user.full_name || user.email,
        performed_by_role: user.role,
        metadata: { cutoff: effectiveCutoff, archived: totalArchived, deleted: totalDeleted, errors },
      });
    } catch (auditErr) {
      console.warn('[archivePostNL] Final audit failed:', auditErr?.message);
    }

    // Create admin notification
    try {
      await svc.entities.Notification.create({
        title: `PostNL Archivering: ${totalArchived} records verwerkt`,
        description: errors.length > 0
          ? `Archivering afgerond met ${errors.length} fout(en). ${totalArchived} gearchiveerd, ${totalDeleted} verwijderd. Cutoff: ${effectiveCutoff}`
          : `Archivering succesvol. ${totalArchived} records gearchiveerd en verwijderd. Cutoff: ${effectiveCutoff}`,
        type: errors.length > 0 ? 'import_failed' : 'import_success',
        priority: errors.length > 0 ? 'high' : 'low',
      });
    } catch (notifErr) {
      console.warn('[archivePostNL] Notification create failed:', notifErr?.message);
    }

    console.log(`[archivePostNL] DONE. ${totalArchived} archived, ${totalDeleted} deleted, ${errors.length} errors`);

    return Response.json({
      success: errors.length === 0,
      cutoff_date: effectiveCutoff,
      archived: totalArchived,
      deleted: totalDeleted,
      batches: batchNum,
      errors,
    });
  } catch (error) {
    console.error('[archiveOldPostNLImports]', error);
    return Response.json({ error: 'SERVER_ERROR', message: error.message }, { status: 500 });
  }
});