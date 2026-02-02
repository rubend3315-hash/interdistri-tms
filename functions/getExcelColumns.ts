import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const columnsSet = new Set();
    
    // ALLEEN kolommen uit PostNLImportResult.data
    const imports = await base44.asServiceRole.entities.PostNLImportResult.list();
    imports.forEach(imp => {
      if (imp.data && typeof imp.data === 'object') {
        Object.keys(imp.data).forEach(key => columnsSet.add(key));
      }
    });
    
    const columns = Array.from(columnsSet).sort();
    
    return Response.json({
      total_columns: columns.length,
      columns: columns,
      import_records: imports.length,
      rapportage_records: rapportageRitten.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});