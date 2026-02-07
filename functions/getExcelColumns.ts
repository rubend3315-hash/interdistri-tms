import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const columnsArray = [];
    const columnsSet = new Set();
    
    // ALLEEN kolommen uit PostNLImportResult.data.data (behoud volgorde)
    const imports = await base44.asServiceRole.entities.PostNLImportResult.filter({});
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
    
    // Voeg Starttijd shift toe als deze nog niet aanwezig is
    if (!columnsSet.has('Starttijd shift')) {
      columnsArray.push('Starttijd shift');
    }
    
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