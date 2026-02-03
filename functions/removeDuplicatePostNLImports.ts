import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Haal alle PostNLImportResult records op
    const allRecords = await base44.asServiceRole.entities.PostNLImportResult.list();
    
    const flattened = [];
    allRecords.forEach(item => {
      if (item.data && typeof item.data === 'object') {
        const innerData = item.data.data || item.data;
        if (innerData && typeof innerData === 'object') {
          flattened.push({
            id: item.id,
            created_date: item.created_date,
            datum: innerData['Datum'],
            chauffeur: innerData['Chauffeur'],
            ritnaam: innerData['Ritnaam'],
            starttijd_shift: item.starttijd_shift || '',
            vrijgegeven: innerData['Vrijgegeven']
          });
        }
      }
    });

    // Identificeer duplicaten
    const seen = new Map();
    const toDelete = [];
    
    flattened.forEach(record => {
      const key = `${record.datum}_${record.chauffeur}_${record.ritnaam}_${record.starttijd_shift}_${record.vrijgegeven}`;
      
      if (seen.has(key)) {
        // Behoud de oudste record, verwijder de nieuwere
        const existing = seen.get(key);
        if (new Date(record.created_date) > new Date(existing.created_date)) {
          toDelete.push(record.id);
        } else {
          toDelete.push(existing.id);
          seen.set(key, record);
        }
      } else {
        seen.set(key, record);
      }
    });

    // Verwijder duplicaten
    for (const id of toDelete) {
      await base44.asServiceRole.entities.PostNLImportResult.delete(id);
    }

    return Response.json({
      success: true,
      total_records: flattened.length,
      duplicates_removed: toDelete.length,
      remaining_records: flattened.length - toDelete.length
    });

  } catch (error) {
    console.error('Error removing duplicates:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});