// syncCbsDieselPrices — Sync daily diesel prices from CBS Open Data (dataset 80416ENG)
// CBS prices are INCL BTW (pompprijs). We also calculate excl BTW (21%).
// Admin only.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const CBS_API_URL = 'https://opendata.cbs.nl/ODataApi/odata/80416ENG/TypedDataSet';
const BTW_RATE = 0.21;
const BATCH_SIZE = 50;
const DEFAULT_LOOKBACK_DAYS = 14; // Scheduled runs: only check last 14 days to avoid rate limits

function cbsPeriodToDate(period) {
  // CBS format: "20260301" → "2026-03-01"
  if (!period || period.length !== 8) return null;
  return `${period.slice(0, 4)}-${period.slice(4, 6)}-${period.slice(6, 8)}`;
}

Deno.serve(async (req) => {
  const t0 = Date.now();
  const log = [];
  const addLog = (msg) => { console.log(`[CBS] ${msg}`); log.push(msg); };

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    // Default: only last 14 days (prevents rate limits on scheduled runs)
    // Pass since='2024-01-01' explicitly for a full backfill
    const defaultSince = new Date();
    defaultSince.setDate(defaultSince.getDate() - DEFAULT_LOOKBACK_DAYS);
    const sinceDate = body.since || defaultSince.toISOString().split('T')[0];

    addLog(`Fetching CBS diesel prices since ${sinceDate}...`);

    // CBS OData filter: Periods >= 'YYYYMMDD'
    const cbsFilter = sinceDate.replace(/-/g, '');
    const url = `${CBS_API_URL}?$filter=Periods ge '${cbsFilter}'&$select=Periods,Diesel_2`;

    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`CBS API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const records = data.value || [];
    addLog(`CBS returned ${records.length} records`);

    if (records.length === 0) {
      return Response.json({ success: true, message: 'Geen nieuwe data', log, ms: Date.now() - t0 });
    }

    // Parse CBS records
    const cbsPrices = records
      .map(r => {
        const date = cbsPeriodToDate(r.Periods);
        const priceInclBtw = r.Diesel_2;
        if (!date || !priceInclBtw) return null;
        const priceExclBtw = Math.round((priceInclBtw / (1 + BTW_RATE)) * 10000) / 10000;
        return { date, price_incl_btw: priceInclBtw, price_excl_btw: priceExclBtw };
      })
      .filter(Boolean);

    addLog(`Parsed ${cbsPrices.length} valid prices`);

    // Get existing dates — paginated to work around SDK bug (>~40 records = corrupted response)
    const svc = base44.asServiceRole;
    const existingAll = [];
    let skip = 0;
    const PAGE = 20;
    while (true) {
      const page = await svc.entities.CbsDieselPrice.filter({ date: { $gte: sinceDate } }, '-date', PAGE, skip);
      if (!Array.isArray(page) || page.length === 0) break;
      existingAll.push(...page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }
    const existingDates = new Set(existingAll.map(e => e.date));

    // Filter new records
    const toInsert = cbsPrices.filter(p => !existingDates.has(p.date));
    addLog(`${toInsert.length} new records to insert (${existingDates.size} already exist)`);

    // Batch insert
    let created = 0;
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);
      await svc.entities.CbsDieselPrice.bulkCreate(batch);
      created += batch.length;
    }

    addLog(`Created ${created} CBS diesel price records`);

    return Response.json({
      success: true,
      fetched: records.length,
      created,
      skipped: cbsPrices.length - toInsert.length,
      ms: Date.now() - t0,
      log,
    });
  } catch (error) {
    console.error('[CBS]', error);
    return Response.json({ error: error.message, log }, { status: 500 });
  }
});