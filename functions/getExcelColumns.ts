import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const columnsArray = [];
    const columnsSet = new Set();
    
    // ALLEEN kolommen uit PostNLImportResult.data.data (behoud volgorde)
    const imports = await base44.asServiceRole.entities.PostNLImportResult.list();
    imports.forEach(imp => {
      if (imp.data && typeof imp.data === 'object') {
        const innerData = imp.data.data || imp.data;
        if (innerData && typeof innerData === 'object') {
          Object.keys(innerData).forEach(key => {
            if (!columnsSet.has(key)) {
              columnsSet.add(key);
              columnsArray.push(key);
            }
          });
        }
      }
    });
    
    const columns = columnsArray;
    
    return Response.json({
      total_columns: columns.length,
      columns: columns,
      total_records: imports.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});