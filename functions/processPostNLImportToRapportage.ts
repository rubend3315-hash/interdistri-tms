import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Types voor betere type safety
interface ImportRow {
  'Datum'?: string;
  'Date'?: string;
  'Chauffeur'?: string;
  'Driver'?: string;
  'Ritnaam'?: string;
  'Route'?: string;
  'Totaal rit'?: string | number;
  '>15 min geen scan'?: string | number;
  'Besteltijd Norm'?: string | number;
  'Besteltijd Bruto'?: string | number;
  'Besteltijd Netto'?: string | number;
  'Aantal bij vrijgave - stops'?: string | number;
  'Aantal bij vrijgave - stuks'?: string | number;
  'Aantal afgeleverd - stuks'?: string | number;
  'Aantal afgeleverd - stops'?: string | number;
  'Aantal stuks afgehaald/gecollecteerd'?: string | number;
  'Aantal PBA-pakketten bezorgd'?: string | number;
}

interface ImportPayload {
  project_id: string;
  project_naam: string;
  klant_id: string;
  import_data: ImportRow[];
}

interface RapportageRit {
  project_id: string;
  project_naam: string;
  klant_id: string;
  import_datum: string;
  week: number;
  datum: string;
  chauffeur: string;
  ritnaam: string;
  totaal_rit: number;
  geen_scan_15min: number;
  besteltijd_norm: number;
  besteltijd_bruto: number;
  besteltijd_netto: number;
  aantal_vrijgave_stops: number;
  aantal_vrijgave_stuks: number;
  aantal_afgeleverd_stuks: number;
  aantal_afgeleverd_stops: number;
  aantal_afgehaald_collecteerd: number;
  aantal_pba_bezorgd: number;
}

Deno.serve(async (req) => {
  try {
    // Valideer HTTP method
    if (req.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed. Use POST.' }, 
        { status: 405 }
      );
    }

    const base44 = createClientFromRequest(req);
    
    // Authenticatie check
    const user = await base44.auth.me();
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Parse en valideer payload
    let payload: ImportPayload;
    try {
      payload = await req.json();
    } catch {
      return Response.json(
        { error: 'Invalid JSON payload' }, 
        { status: 400 }
      );
    }

    const { project_id, project_naam, klant_id, import_data } = payload;

    // Valideer verplichte velden
    if (!project_id || !project_naam || !klant_id) {
      return Response.json(
        { error: 'Missing required fields: project_id, project_naam, or klant_id' },
        { status: 400 }
      );
    }

    if (!import_data || !Array.isArray(import_data) || import_data.length === 0) {
      return Response.json(
        { error: 'import_data must be a non-empty array' },
        { status: 400 }
      );
    }

    // Valideer array size (voorkom te grote imports)
    if (import_data.length > 10000) {
      return Response.json(
        { error: 'import_data exceeds maximum size of 10,000 rows' },
        { status: 400 }
      );
    }

    console.log(`Import started: ${import_data.length} rows for project ${project_naam}`);

    // Haal bestaande ritten op (gefilterd op project voor betere performance)
    const existingRits = await base44.asServiceRole.entities.RapportageRit.list({
      filter: { project_id }
    });

    // Bouw duplicate detection key set
    const existingKeys = new Set(
      existingRits.map(r => 
        `${r.project_id}_${r.datum}_${r.ritnaam}_${r.chauffeur}`.toLowerCase()
      )
    );

    // Verwerk en valideer import data
    const validationErrors: string[] = [];
    const ritsToCreate: RapportageRit[] = [];
    const skippedDuplicates: string[] = [];

    for (let i = 0; i < import_data.length; i++) {
      const row = import_data[i];
      const rowNum = i + 1;

      // Haal datum op
      const datum = row['Datum'] || row['Date'] || '';
      if (!datum) {
        validationErrors.push(`Row ${rowNum}: Missing datum/date`);
        continue;
      }

      // Valideer datum format
      if (!isValidDate(datum)) {
        validationErrors.push(`Row ${rowNum}: Invalid date format: ${datum}`);
        continue;
      }

      const chauffeur = row['Chauffeur'] || row['Driver'] || 'Onbekend';
      const ritnaam = row['Ritnaam'] || row['Route'] || '';

      if (!ritnaam) {
        validationErrors.push(`Row ${rowNum}: Missing ritnaam/route`);
        continue;
      }

      // Check voor duplicaten
      const key = `${project_id}_${datum}_${ritnaam}_${chauffeur}`.toLowerCase();
      if (existingKeys.has(key)) {
        skippedDuplicates.push(`${datum} - ${ritnaam} - ${chauffeur}`);
        continue;
      }

      // Voeg toe aan set om dubbelen binnen deze batch te detecteren
      existingKeys.add(key);

      // Bereken weeknummer
      const weekNum = calculateWeek(datum);

      // Parse en valideer numerieke velden
      const rit: RapportageRit = {
        project_id,
        project_naam,
        klant_id,
        import_datum: new Date().toISOString().split('T')[0],
        week: weekNum,
        datum: datum,
        chauffeur: chauffeur,
        ritnaam: ritnaam,
        totaal_rit: parseNumber(row['Totaal rit'], 0),
        geen_scan_15min: parseInt(String(row['>15 min geen scan'] || 0)) || 0,
        besteltijd_norm: parseNumber(row['Besteltijd Norm'], 0),
        besteltijd_bruto: parseNumber(row['Besteltijd Bruto'], 0),
        besteltijd_netto: parseNumber(row['Besteltijd Netto'], 0),
        aantal_vrijgave_stops: parseInt(String(row['Aantal bij vrijgave - stops'] || 0)) || 0,
        aantal_vrijgave_stuks: parseInt(String(row['Aantal bij vrijgave - stuks'] || 0)) || 0,
        aantal_afgeleverd_stuks: parseInt(String(row['Aantal afgeleverd - stuks'] || 0)) || 0,
        aantal_afgeleverd_stops: parseInt(String(row['Aantal afgeleverd - stops'] || 0)) || 0,
        aantal_afgehaald_collecteerd: parseInt(String(row['Aantal stuks afgehaald/gecollecteerd'] || 0)) || 0,
        aantal_pba_bezorgd: parseInt(String(row['Aantal PBA-pakketten bezorgd'] || 0)) || 0,
      };

      ritsToCreate.push(rit);
    }

    // Als er validatie errors zijn, return deze
    if (validationErrors.length > 0) {
      return Response.json({
        error: 'Validation errors',
        validation_errors: validationErrors.slice(0, 100), // Limiteer naar eerste 100 errors
        total_errors: validationErrors.length
      }, { status: 400 });
    }

    // Als er niets te importeren is
    if (ritsToCreate.length === 0) {
      return Response.json({
        success: true,
        count: 0,
        skipped: skippedDuplicates.length,
        message: `Alle ${import_data.length} ritten waren al geïmporteerd (dubbelen overgeslagen)`,
        duplicates: skippedDuplicates.slice(0, 10) // Toon eerste 10 duplicaten
      });
    }

    // Bulk create met chunking voor grote datasets
    const CHUNK_SIZE = 500;
    const chunks = [];
    for (let i = 0; i < ritsToCreate.length; i += CHUNK_SIZE) {
      chunks.push(ritsToCreate.slice(i, i + CHUNK_SIZE));
    }

    let totalCreated = 0;
    for (const chunk of chunks) {
      const created = await base44.asServiceRole.entities.RapportageRit.bulkCreate(chunk);
      totalCreated += created.length;
    }

    console.log(`Import completed: ${totalCreated} ritten created, ${skippedDuplicates.length} skipped`);

    return Response.json({
      success: true,
      count: totalCreated,
      skipped: skippedDuplicates.length,
      message: `${totalCreated} ritten geïmporteerd${skippedDuplicates.length > 0 ? `, ${skippedDuplicates.length} dubbelen overgeslagen` : ''}`,
      duplicates_sample: skippedDuplicates.slice(0, 5) // Toon eerste 5 als voorbeeld
    });

  } catch (error) {
    console.error('Import error:', error);
    
    // Geef meer specifieke error informatie
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return Response.json({
      error: 'Import failed',
      message: errorMessage,
      ...(Deno.env.get('ENV') === 'development' && { stack: errorStack })
    }, { status: 500 });
  }
});

/**
 * Bereken ISO weeknummer
 */
function calculateWeek(dateString: string): number {
  if (!dateString) return 0;

  try {
    const date = new Date(dateString);
    
    // Check of datum geldig is
    if (isNaN(date.getTime())) {
      return 0;
    }

    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  } catch {
    return 0;
  }
}

/**
 * Valideer of een string een geldige datum is
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Parse een waarde naar een nummer met fallback
 */
function parseNumber(value: string | number | undefined, fallback: number = 0): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(parsed) ? fallback : parsed;
}