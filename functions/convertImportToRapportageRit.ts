import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { klant_id } = payload;

    // Haal alle ProjectImportData op
    const imports = await base44.asServiceRole.entities.ProjectImportData.list();
    
    const ritenMap = {}; // Group by ritnaam only (unique identifier)
    
    imports.forEach(imp => {
      if (!imp.data) return;
      
      const data = imp.data;
      const datum = data['Datum'] || data['Date'] || imp.import_datum;
      
      const ritnaam = data['Ritnaam'] || data['Route'] || data['Trip'] || 'N/A';
      const key = `${datum}_${ritnaam}`;
      
      // Verzamel alle artikelen (alle kolommen behalve standaard velden)
      const standaardVelden = ['Datum', 'Date', 'Chauffeur', 'Driver', 'Ritnaam', 'Route', 'Trip', 'Totaal rit', 'Total', '>15 min geen scan', 'Besteltijd Norm', 'Besteltijd Bruto', 'Besteltijd Netto', 'Aantal bij vrijgave - stops', 'Aantal bij vrijgave - stuks', 'Aantal afgeleverd - stuks', 'Aantal afgeleverd - stops', 'Aantal stuks afgehaald/gecollecteerd', 'Aantal PBA-pakketten bezorgd'];
      const artikelen = Object.entries(data)
        .filter(([key]) => !standaardVelden.includes(key) && data[key])
        .map(([kolom, waarde]) => ({ kolom, waarde: String(waarde) }));
      
      if (!ritenMap[key]) {
        const week = calculateWeek(datum);
        ritenMap[key] = {
          project_id: imp.project_id,
          project_naam: imp.project_naam,
          klant_id: imp.klant_id || 'PostNL',
          import_datum: imp.import_datum,
          week: week,
          datum: datum,
          chauffeur: data['Chauffeur'] || data['Driver'] || 'Onbekend',
          ritnaam: ritnaam,
          totaal_rit: parseFloat(data['Totaal rit'] || data['Total'] || 0),
          geen_scan_15min: parseInt(data['>15 min geen scan'] || 0),
          besteltijd_norm: parseFloat(data['Besteltijd Norm'] || 0),
          besteltijd_bruto: parseFloat(data['Besteltijd Bruto'] || 0),
          besteltijd_netto: parseFloat(data['Besteltijd Netto'] || 0),
          aantal_vrijgave_stops: parseInt(data['Aantal bij vrijgave - stops'] || 0),
          aantal_vrijgave_stuks: parseInt(data['Aantal bij vrijgave - stuks'] || 0),
          aantal_afgeleverd_stuks: parseInt(data['Aantal afgeleverd - stuks'] || 0),
          aantal_afgeleverd_stops: parseInt(data['Aantal afgeleverd - stops'] || 0),
          aantal_afgehaald_collecteerd: parseInt(data['Aantal stuks afgehaald/gecollecteerd'] || 0),
          aantal_pba_bezorgd: parseInt(data['Aantal PBA-pakketten bezorgd'] || 0),
          artikelen: artikelen
        };
      }
    });
    
    // Haal bestaande ritten op om duplicaten te voorkomen
    const existingRits = await base44.asServiceRole.entities.RapportageRit.list();
    const existingKeys = new Set(
      existingRits.map(r => `${r.datum}_${r.ritnaam}_${r.chauffeur}`)
    );

    const ritsToCreate = Object.values(ritenMap).filter(rit => {
      const key = `${rit.datum}_${rit.ritnaam}_${rit.chauffeur}`;
      return !existingKeys.has(key);
    });

    if (ritsToCreate.length === 0) {
      return Response.json({ 
        success: true, 
        count: 0,
        message: 'Geen nieuwe ritten gevonden (allemaal al geïmporteerd)'
      });
    }

    const created = await base44.asServiceRole.entities.RapportageRit.bulkCreate(ritsToCreate);

    // Stuur notificatie naar admins
    try {
      const allUsers = await base44.asServiceRole.entities.User.list();
      const admins = allUsers.filter(u => u.role === 'admin');
      
      for (const admin of admins) {
        await base44.asServiceRole.functions.invoke('notifyImportSuccess', {
          ontvanger_email: admin.email,
          count: created.length,
          type: 'rapportage',
          skipped: 0
        });
      }
    } catch (notifyError) {
      console.error('Failed to send notification:', notifyError);
    }

    return Response.json({ 
      success: true, 
      count: created.length,
      message: `${created.length} ritten geconverteerd van imports`
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateWeek(dateString) {
  if (!dateString) return 0;
  
  try {
    const date = new Date(dateString);
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  } catch {
    return 0;
  }
}