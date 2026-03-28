// syncDieselPrices — Sync diesel prices from TLN xlsx into DieselPrice entity
// First run: imports all data from 2023-01-01 onward
// Subsequent runs: only adds missing dates
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import * as XLSX from 'npm:xlsx@0.18.5';

const TLN_URL = 'https://cms.tln.nl/storage/media/06.Ledenvoordeel/Brandstofmonitor/Dagelijkse-dieselprijs.xlsx';
const CUTOFF_DATE = '2023-01-01';
const BATCH_SIZE = 50;

function excelDateToJS(serial) {
  const epoch = new Date(1899, 11, 30);
  return new Date(epoch.getTime() + serial * 86400000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }
    const svc = base44.asServiceRole;

    // 1. Fetch TLN xlsx
    console.log('[syncDiesel] Downloading TLN xlsx...');
    const res = await fetch(TLN_URL);
    if (!res.ok) {
      return Response.json({ error: `TLN download failed: ${res.status}` }, { status: 502 });
    }
    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // 2. Parse all prices from 2023 onward
    const xlsPrices = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      const serial = row[0];
      const price = row[1];
      if (typeof serial !== 'number' || typeof price !== 'number' || price <= 0) continue;
      const dateObj = excelDateToJS(serial);
      const dateStr = dateObj.toISOString().split('T')[0];
      if (dateStr < CUTOFF_DATE) continue;
      xlsPrices.push({ date: dateStr, price: Math.round(price * 10000) / 10000 });
    }
    console.log(`[syncDiesel] ${xlsPrices.length} prijzen in xlsx vanaf ${CUTOFF_DATE}`);

    // 3. Fetch existing dates from DB — paginated to avoid SDK bug
    const existingAll = [];
    let _skip = 0;
    const _PAGE = 20;
    while (true) {
      const page = await svc.entities.DieselPrice.filter({ date: { $gte: CUTOFF_DATE } }, 'date', _PAGE, _skip);
      if (!Array.isArray(page) || page.length === 0) break;
      existingAll.push(...page);
      if (page.length < _PAGE) break;
      _skip += _PAGE;
    }
    const existingDates = new Set(existingAll.map(r => r.date));
    console.log(`[syncDiesel] ${existingDates.size} prijzen al in database`);

    // 4. Find missing dates
    const toInsert = xlsPrices.filter(p => !existingDates.has(p.date));
    console.log(`[syncDiesel] ${toInsert.length} nieuwe prijzen toe te voegen`);

    if (toInsert.length === 0) {
      return Response.json({
        success: true,
        message: 'Database is al up-to-date',
        total_in_xlsx: xlsPrices.length,
        already_in_db: existingDates.size,
        inserted: 0,
      });
    }

    // 5. Bulk insert in batches
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      await svc.entities.DieselPrice.bulkCreate(batch);
      inserted += batch.length;
    }
    console.log(`[syncDiesel] ${inserted} prijzen ingevoegd`);

    return Response.json({
      success: true,
      total_in_xlsx: xlsPrices.length,
      already_in_db: existingDates.size,
      inserted,
      latest: xlsPrices[xlsPrices.length - 1],
    });
  } catch (error) {
    console.error('[syncDiesel]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});