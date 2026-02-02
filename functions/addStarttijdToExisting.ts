import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Haal alle bestaande PostNLImportResult records op
    const imports = await base44.asServiceRole.entities.PostNLImportResult.list();
    
    let updatedCount = 0;

    for (const imp of imports) {
      if (imp.data && typeof imp.data === 'object') {
        const innerData = imp.data.data || imp.data;
        
        // Controleer of Starttijd shift nog niet aanwezig is of leeg is
        if (innerData && typeof innerData === 'object' && !innerData['Starttijd shift']) {
          // Voeg Starttijd shift toe met standaardwaarde
          const updatedInnerData = {
            ...innerData,
            'Starttijd shift': '08:10'
          };
          
          // Update het record
          await base44.asServiceRole.entities.PostNLImportResult.update(imp.id, {
            data: {
              ...imp.data,
              data: updatedInnerData
            }
          });
          
          updatedCount++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `${updatedCount} records bijgewerkt met Starttijd shift`,
      updatedCount: updatedCount
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});