import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Haal alle PostNLImportResult records op
    const imports = await base44.asServiceRole.entities.PostNLImportResult.list();
    
    const columnsSet = new Set();
    
    // Verzamel alle unieke kolommen uit alle data objects
    imports.forEach(imp => {
      if (imp.data && typeof imp.data === 'object') {
        Object.keys(imp.data).forEach(key => columnsSet.add(key));
      }
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