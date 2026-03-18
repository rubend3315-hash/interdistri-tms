import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Haal alle RapportageRit records op
    const allRits = await base44.asServiceRole.entities.RapportageRit.list();
    
    if (allRits.length === 0) {
      return Response.json({ 
        message: 'Geen RapportageRit records gevonden',
        deleted_count: 0 
      });
    }

    // Verwijder alle records
    let deletedCount = 0;
    for (const rit of allRits) {
      await base44.asServiceRole.entities.RapportageRit.delete(rit.id);
      deletedCount++;
    }

    return Response.json({ 
      message: `${deletedCount} RapportageRit records verwijderd`,
      deleted_count: deletedCount 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});