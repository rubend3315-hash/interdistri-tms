import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { getISOWeek } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Haal alle PostNL import results op
    const imports = await base44.asServiceRole.entities.PostNLImportResult.list();
    
    // Filter op PakketDistributie project en PostNL
    const prj01Imports = imports.filter(imp => 
      imp.project_naam === 'PakketDistributie' && imp.klant_naam === 'PostNL'
    );

    let createdCount = 0;
    const errors = [];

    for (const imp of prj01Imports) {
      try {
        const importData = imp.data || {};
        
        // Haal week uit datum (ISO week number)
        const dateParts = imp.datum?.split('-');
        const datumDate = dateParts ? new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`) : new Date();
        const week = getISOWeek(datumDate);

        // Verzamel artikel data uit import
        const artikelen_arr = Object.entries(importData)
          .filter(([key]) => !['aantal_stops', 'aantal_stuks', 'totaal'].includes(key))
          .map(([kolom, waarde]) => ({
            kolom,
            waarde: String(waarde || '')
          }));

        // Haal nummers uit importData (standaardkolommen)
        const aantal_vrijgave_stops = parseFloat(importData['Aantal vrijgave - stops']) || 0;
        const aantal_vrijgave_stuks = parseFloat(importData['Aantal vrijgave - stuks']) || 0;
        const aantal_afgeleverd_stuks = parseFloat(importData['Aantal afgeleverd - stuks']) || 0;
        const aantal_afgeleverd_stops = parseFloat(importData['Aantal afgeleverd - stops']) || 0;
        const aantal_afgehaald_collecteerd = parseFloat(importData['Aantal afgehaald/gecollecteerd']) || 0;
        const aantal_pba_bezorgd = parseFloat(importData['Aantal PBA-pakketten bezorgd']) || 0;

        // Haal "Totaal rit" op uit importData (dit is een tijd, bijv. "08:21:51")
        const totaal_rit = importData['Totaal rit'] || '';

        // Maak RapportageRit record
        const rapportage = {
          project_id: imp.project_id,
          project_naam: imp.project_naam,
          klant_id: '',
          import_datum: imp.import_datum,
          week,
          datum: imp.datum,
          chauffeur: importData['Chauffeur'] || '',
          ritnaam: imp.ritnaam,
          totaal_rit,
          geen_scan_15min: parseFloat(importData['>15 min geen scan']) || 0,
          besteltijd_norm: parseFloat(importData['Besteltijd norm']) || 0,
          besteltijd_bruto: parseFloat(importData['Besteltijd Bruto']) || 0,
          besteltijd_netto: parseFloat(importData['Besteltijd Netto']) || 0,
          aantal_vrijgave_stops,
          aantal_vrijgave_stuks,
          aantal_afgeleverd_stuks,
          aantal_afgeleverd_stops,
          aantal_afgehaald_collecteerd,
          aantal_pba_bezorgd,
          artikelen: artikelen_arr,
          status: 'verwerkt'
        };

        await base44.asServiceRole.entities.RapportageRit.create(rapportage);
        createdCount++;
      } catch (error) {
        errors.push(`Error processing ${imp.ritnaam}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      message: `Verwerkt: ${createdCount} ritten`,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});