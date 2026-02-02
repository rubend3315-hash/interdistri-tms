import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    const { records, customerId } = payload;
    
    if (!records || !Array.isArray(records) || !customerId) {
      return Response.json({ error: 'Missing records or customerId' }, { status: 400 });
    }
    
    const convertedRits = records.map(record => {
      const datum = record.data?.['Datum'] || '';
      
      // Calculate week number
      let week = 0;
      if (datum) {
        const parts = datum.split('-');
        if (parts.length === 3) {
          const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          const jan1 = new Date(d.getFullYear(), 0, 1);
          const ms = d - jan1;
          week = Math.ceil((ms / 86400000 + jan1.getDay() + 1) / 7);
        }
      }
      
      return {
        project_id: record.project_id || '',
        project_naam: record.project_naam,
        klant_id: customerId,
        import_datum: record.import_datum,
        week,
        datum: datum,
        chauffeur: record.data?.['Chauffeur'] || '',
        ritnaam: record.ritnaam || record.data?.['Ritnaam'] || '',
        totaal_rit: record.data?.['Totaal rit'] || '',
        geen_scan_15min: parseFloat(record.data?.['>15 min geen scan'] || 0) || 0,
        besteltijd_norm: parseFloat(record.data?.['Besteltijd Norm'] || 0) || 0,
        besteltijd_bruto: parseFloat(record.data?.['Besteltijd Bruto'] || 0) || 0,
        besteltijd_netto: parseFloat(record.data?.['Besteltijd Netto'] || 0) || 0,
        aantal_vrijgave_stops: parseInt(record.data?.['Aantal bij vrijgave - stops'] || 0) || 0,
        aantal_vrijgave_stuks: parseInt(record.data?.['Aantal bij vrijgave - stuks'] || 0) || 0,
        aantal_afgeleverd_stuks: parseInt(record.data?.['Aantal afgeleverd - stuks'] || 0) || 0,
        aantal_afgeleverd_stops: parseInt(record.data?.['Aantal afgeleverd - stops'] || 0) || 0,
        aantal_afgehaald_collecteerd: parseInt(record.data?.['Aantal stuks afgehaald/gecollecteerd'] || 0) || 0,
        aantal_pba_bezorgd: parseInt(record.data?.['Aantal PBA-pakketten bezorgd'] || 0) || 0,
        status: 'concept'
      };
    });
    
    const created = await base44.asServiceRole.entities.RapportageRit.bulkCreate(convertedRits);
    
    return Response.json({ 
      success: true,
      count: created.length
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});