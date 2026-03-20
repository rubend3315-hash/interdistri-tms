// fetchDieselPrice — Fetch current diesel price from TLN Brandstofmonitor (excl. BTW)
// Source: https://cms.tln.nl/storage/media/06.Ledenvoordeel/Brandstofmonitor/Dagelijkse-dieselprijs.xlsx
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import * as XLSX from 'npm:xlsx@0.18.5';

const TLN_URL = 'https://cms.tln.nl/storage/media/06.Ledenvoordeel/Brandstofmonitor/Dagelijkse-dieselprijs.xlsx';

// Excel serial number to JS Date
function excelDateToJS(serial) {
  // Excel epoch: 1900-01-01 = serial 1 (with the 1900 leap year bug)
  const epoch = new Date(1899, 11, 30); // Dec 30, 1899
  return new Date(epoch.getTime() + serial * 86400000);
}

// JS Date to Excel serial
function jsDateToExcel(date) {
  const epoch = new Date(1899, 11, 30);
  return Math.round((date.getTime() - epoch.getTime()) / 86400000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the xlsx
    const res = await fetch(TLN_URL);
    if (!res.ok) {
      return Response.json({ error: `TLN download failed: ${res.status}` }, { status: 502 });
    }

    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find the most recent price (last row with a non-zero price)
    // Data format: [excel_serial, price, ...]
    // Skip header row (row 0)
    let latestDate = null;
    let latestPrice = null;
    const recentPrices = []; // last 7 days with prices

    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      const serial = row[0];
      const price = row[1];
      if (typeof serial !== 'number' || typeof price !== 'number') continue;
      if (price <= 0) continue;

      const dateObj = excelDateToJS(serial);
      const dateStr = dateObj.toISOString().split('T')[0];

      if (!latestDate) {
        latestDate = dateStr;
        latestPrice = price;
      }

      if (recentPrices.length < 90) {
        recentPrices.push({ date: dateStr, price: Math.round(price * 1000000) / 1000000 });
      } else {
        break;
      }
    }

    if (!latestPrice) {
      return Response.json({ error: 'Geen actuele prijsdata gevonden in TLN bestand' }, { status: 404 });
    }

    return Response.json({
      source: 'TLN Brandstofmonitor',
      url: TLN_URL,
      unit: '€/liter excl. BTW (af pomp)',
      latest: {
        date: latestDate,
        price: Math.round(latestPrice * 1000000) / 1000000,
      },
      recent: recentPrices,
    });
  } catch (error) {
    console.error('[fetchDieselPrice]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});