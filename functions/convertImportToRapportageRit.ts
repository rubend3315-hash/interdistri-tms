import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const payload = await req.json();

    const { project_id, project_naam, klant_id, import_data } = payload;

    if (!import_data || !Array.isArray(import_data)) {
      return Response.json({ error: 'Invalid import_data' }, { status: 400 });
    }

    // Haal bestaande ritten op om duplicaten te voorkomen
    const existingRits = await base44.asServiceRole.entities.RapportageRit.list();
    const existingKeys = new Set(
      existingRits.map(r => `${r.datum}_${r.ritnaam}_${r.chauffeur}`)
    );

    const ritsToCreate = import_data.map(row => {
      const datum = row['Datum'] || row['Date'] || '';
      const weekNum = calculateWeek(datum);

      return {
        project_id,
        project_naam,
        klant_id,
        import_datum: new Date().toISOString().split('T')[0],
        week: weekNum,
        datum: datum,
        chauffeur: row['Chauffeur'] || row['Driver'] || 'Onbekend',
        ritnaam: row['Ritnaam'] || row['Route'] || 'N/A',
        totaal_rit: parseFloat(row['Totaal rit'] || 0),
        geen_scan_15min: parseInt(row['>15 min geen scan'] || 0),
        besteltijd_norm: parseFloat(row['Besteltijd Norm'] || 0),
        besteltijd_bruto: parseFloat(row['Besteltijd Bruto'] || 0),
        besteltijd_netto: parseFloat(row['Besteltijd Netto'] || 0),
        aantal_vrijgave_stops: parseInt(row['Aantal bij vrijgave - stops'] || 0),
        aantal_vrijgave_stuks: parseInt(row['Aantal bij vrijgave - stuks'] || 0),
        aantal_afgeleverd_stuks: parseInt(row['Aantal afgeleverd - stuks'] || 0),
        aantal_afgeleverd_stops: parseInt(row['Aantal afgeleverd - stops'] || 0),
        aantal_afgehaald_collecteerd: parseInt(row['Aantal stuks afgehaald/gecollecteerd'] || 0),
        aantal_pba_bezorgd: parseInt(row['Aantal PBA-pakketten bezorgd'] || 0)
      };
    });

    // Filter dubbelen eruit
    const uniqueRits = ritsToCreate.filter(rit => {
      const key = `${rit.datum}_${rit.ritnaam}_${rit.chauffeur}`;
      if (existingKeys.has(key)) {
        return false; // Skip bestaande
      }
      existingKeys.add(key); // Voeg toe om dubbelen binnen deze batch te voorkomen
      return true;
    });

    if (uniqueRits.length === 0) {
      return Response.json({ 
        success: true, 
        count: 0,
        skipped: import_data.length,
        message: `Alle ${import_data.length} ritten waren al geïmporteerd (dubbelen overgeslagen)`
      });
    }

    const created = await base44.asServiceRole.entities.RapportageRit.bulkCreate(uniqueRits);

    const skippedCount = import_data.length - uniqueRits.length;
    
    // Stuur notificatie naar de gebruiker
    try {
      await base44.asServiceRole.functions.invoke('notifyImportSuccess', {
        ontvanger_email: user.email,
        count: created.length,
        type: 'rapportage',
        project_naam,
        skipped: skippedCount
      });
    } catch (notifyError) {
      console.error('Failed to send notification:', notifyError);
    }
    
    return Response.json({ 
      success: true, 
      count: created.length,
      skipped: skippedCount,
      message: `${created.length} ritten geïmporteerd${skippedCount > 0 ? `, ${skippedCount} dubbelen overgeslagen` : ''}`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateWeek(dateString) {
  if (!dateString) return 0;
  
  const date = new Date(dateString);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
}