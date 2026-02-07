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
    let imports = [];
    try {
      const result = await base44.asServiceRole.entities.PostNLImportResult.filter({});
      imports = Array.isArray(result) ? result : [];
    } catch (e) {
      console.error('Failed to list PostNLImportResult:', e.message);
      // Fallback: try with user scope
      try {
        const result2 = await base44.entities.PostNLImportResult.filter({});
        imports = Array.isArray(result2) ? result2 : [];
      } catch (e2) {
        console.error('Fallback also failed:', e2.message);
        imports = [];
      }
    }
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