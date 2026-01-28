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

    // Parse Excel met XLSX library
    const XLSX = await import('npm:xlsx@0.18.5');
    const workbook = XLSX.read(new Uint8Array(fileBuffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    // Zoek naar "Depot" rij (kolomnamen)
    let dataStartIndex = 0;
    let headerRow = null;
    
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const firstColumnValue = Object.values(row)[0];
      
      if (typeof firstColumnValue === 'string' && firstColumnValue.includes('Depot')) {
        headerRow = row;
        dataStartIndex = i + 1;
        break;
      }
    }

    // Sla lege rijen over na Depot rij
    while (dataStartIndex < rawData.length) {
      const row = rawData[dataStartIndex];
      const hasAnyValue = Object.values(row).some(val => val && val.toString().trim() !== '');
      if (hasAnyValue) break;
      dataStartIndex++;
    }

    // Filter data: negeer "Totaal" rijen
    let data = rawData.slice(dataStartIndex).filter(row => {
      const firstColumnValue = Object.values(row)[0];
      return !(typeof firstColumnValue === 'string' && firstColumnValue.includes('Totaal'));
    });

    // Detecteer kolommen en filter lege kolommen
    let columns = headerRow ? Object.keys(headerRow) : Object.keys(data[0] || {});
    
    // Filter kolommen die volledig leeg zijn (alleen lege waarden in alle data rijen)
    columns = columns.filter(col => {
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
      preview: data.slice(0, 5),
      totalRows: data.length,
      rawData: data
    });
  } catch (error) {
    console.error('Excel import error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});