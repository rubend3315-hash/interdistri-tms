import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const customerId = formData.get('customerId');

    if (!file || !customerId) {
      return Response.json({ error: 'File en customerId zijn vereist' }, { status: 400 });
    }

    // Upload het bestand
    const fileBuffer = await file.arrayBuffer();
    const uploadResponse = await base44.integrations.Core.UploadFile({
      file: new File([fileBuffer], file.name, { type: file.type })
    });

    // Parse Excel met XLSX library - lees als raw arrays
    const XLSX = await import('npm:xlsx@0.18.5');
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array', header: 1 });
    const sheetName = workbook.SheetNames[0];
    const rawRows = workbook.Sheets[sheetName];
    
    // Converteer raw rows naar array format
    const allRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    // Zoek naar "Depot" rij (header)
    let headerRowIndex = -1;
    let headerRow = [];
    
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (row[0] && row[0].toString().includes('Depot')) {
        headerRow = row;
        headerRowIndex = i;
        break;
      }
    }

    // Start data na header, skip lege rijen
    let dataStartIndex = headerRowIndex + 1;
    while (dataStartIndex < allRows.length) {
      const row = allRows[dataStartIndex];
      const hasAnyValue = row.some(val => val && val.toString().trim() !== '');
      if (hasAnyValue) break;
      dataStartIndex++;
    }

    // Converteer data rijen naar objecten met header kolommen
    const data = [];
    for (let i = dataStartIndex; i < allRows.length; i++) {
      const row = allRows[i];
      const hasAnyValue = row.some(val => val && val.toString().trim() !== '');
      if (!hasAnyValue) break; // Stop bij lege rij
      
      const firstCol = row[0] ? row[0].toString().trim() : '';
      if (firstCol && !firstCol.includes('Totaal')) {
        const rowObj = {};
        headerRow.forEach((col, idx) => {
          rowObj[col || `__EMPTY_${idx}`] = row[idx] || '';
        });
        data.push(rowObj);
      }
    }

    // Filter kolommen die volledig leeg zijn
    let columns = headerRow.filter(col => {
      return data.some(row => {
        const value = row[col];
        return value && value.toString().trim() !== '';
      });
    });

    return Response.json({
      success: true,
      fileName: file.name,
      fileUrl: uploadResponse.file_url,
      columns: columns,
      preview: data,
      totalRows: data.length,
      rawData: data
    });
  } catch (error) {
    console.error('Excel import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});