import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const columnsSet = new Set();
    
    // Kolommen uit PostNLImportResult
    const imports = await base44.asServiceRole.entities.PostNLImportResult.list();
    imports.forEach(imp => {
      if (imp.data && typeof imp.data === 'object') {
        Object.keys(imp.data).forEach(key => columnsSet.add(key));
      }
    });
    
    // Basis velden uit RapportageRit
    const rapportageRitten = await base44.asServiceRole.entities.RapportageRit.list();
    rapportageRitten.forEach(rit => {
      Object.keys(rit).forEach(key => {
        if (!['data', 'artikelen', 'id', 'created_date', 'updated_date', 'created_by'].includes(key)) {
          columnsSet.add(key);
        }
      });
    });
    
    const columns = Array.from(columnsSet).sort();
    
    return Response.json({
      total_columns: columns.length,
      columns: columns,
      total_records: imports.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});