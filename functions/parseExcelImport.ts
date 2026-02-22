import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Types
interface ExcelRow {
  [key: string]: string | number | boolean | null;
}

interface UploadResponse {
  success: boolean;
  fileName: string;
  fileUrl: string;
  columns: string[];
  preview: ExcelRow[];
  totalRows: number;
  rawData: ExcelRow[];
  metadata: {
    headerRowIndex: number;
    dataStartIndex: number;
    emptyColumnsRemoved: number;
    sheetName: string;
  };
}

interface ErrorResponse {
  error: string;
  details?: string;
}

// Constanten
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const SUPPORTED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv'
];
const MAX_PREVIEW_ROWS = 100;

Deno.serve(async (req) => {
  try {
    // Valideer HTTP method
    if (req.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed. Use POST.' } as ErrorResponse,
        { status: 405 }
      );
    }

    // Authenticatie
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json(
        { error: 'Unauthorized' } as ErrorResponse,
        { status: 401 }
      );
    }

    // Parse FormData
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      return Response.json(
        { 
          error: 'Invalid form data',
          details: error instanceof Error ? error.message : 'Unknown error'
        } as ErrorResponse,
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const customerId = formData.get('customerId') as string | null;

    // Valideer input
    if (!file) {
      return Response.json(
        { error: 'File is required' } as ErrorResponse,
        { status: 400 }
      );
    }

    if (!customerId || customerId.trim() === '') {
      return Response.json(
        { error: 'customerId is required' } as ErrorResponse,
        { status: 400 }
      );
    }

    // Valideer bestandsgrootte
    if (file.size === 0) {
      return Response.json(
        { error: 'File is empty' } as ErrorResponse,
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { 
          error: 'File too large',
          details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Valideer bestandstype
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return Response.json(
        { 
          error: 'Unsupported file type',
          details: `Supported types: ${SUPPORTED_TYPES.join(', ')}`
        } as ErrorResponse,
        { status: 400 }
      );
    }

    console.log(`Processing file: ${file.name} (${file.size} bytes) for customer ${customerId}`);

    // Upload het bestand naar Base44
    const fileBuffer = await file.arrayBuffer();
    let uploadResponse;
    
    try {
      uploadResponse = await base44.integrations.Core.UploadFile({
        file: new File([fileBuffer], file.name, { type: file.type })
      });
    } catch (error) {
      console.error('File upload failed:', error);
      return Response.json(
        { 
          error: 'File upload failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        } as ErrorResponse,
        { status: 500 }
      );
    }

    // Parse Excel met XLSX library
    const XLSX = await import('npm:xlsx@0.18.5');
    let workbook;
    
    try {
      workbook = XLSX.read(new Uint8Array(fileBuffer), { 
        type: 'array',
        cellDates: true, // Parse datums correct
        cellNF: true, // Behoud number formatting
        cellStyles: false // Skip styles voor performance
      });
    } catch (error) {
      console.error('Excel parsing failed:', error);
      return Response.json(
        { 
          error: 'Failed to parse Excel file',
          details: error instanceof Error ? error.message : 'Invalid Excel format'
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Valideer workbook
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return Response.json(
        { error: 'Excel file contains no sheets' } as ErrorResponse,
        { status: 400 }
      );
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Converteer naar array format
    const allRows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
      worksheet,
      { 
        header: 1,
        raw: false, // Converteer alle waarden naar strings
        defval: '' // Default waarde voor lege cellen
      }
    );

    if (allRows.length === 0) {
      return Response.json(
        { error: 'Excel sheet is empty' } as ErrorResponse,
        { status: 400 }
      );
    }

    // Zoek naar "Depot" header rij
    const { headerRowIndex, headerRow } = findHeaderRow(allRows);

    if (headerRowIndex === -1) {
      return Response.json(
        { 
          error: 'Header row not found',
          details: 'Could not find a row containing "Depot"'
        } as ErrorResponse,
        { status: 400 }
      );
    }

    // Vind start van data (skip lege rijen na header)
    const dataStartIndex = findDataStartIndex(allRows, headerRowIndex);

    if (dataStartIndex >= allRows.length) {
      return Response.json(
        { error: 'No data rows found after header' } as ErrorResponse,
        { status: 400 }
      );
    }

    // Converteer data rijen naar objecten
    const data = parseDataRows(allRows, headerRow, dataStartIndex);

    if (data.length === 0) {
      return Response.json(
        { error: 'No valid data rows found' } as ErrorResponse,
        { status: 400 }
      );
    }

    // Filter lege kolommen
    const { filteredColumns, removedCount } = filterEmptyColumns(headerRow, data);

    // Bouw response
    const response: UploadResponse = {
      success: true,
      fileName: file.name,
      fileUrl: uploadResponse.file_url,
      columns: filteredColumns,
      preview: data.slice(0, MAX_PREVIEW_ROWS), // Limiteer preview
      totalRows: data.length,
      rawData: data,
      metadata: {
        headerRowIndex,
        dataStartIndex,
        emptyColumnsRemoved: removedCount,
        sheetName
      }
    };

    console.log(`Successfully processed ${data.length} rows with ${filteredColumns.length} columns`);

    return Response.json(response);

  } catch (error) {
    console.error('Excel import error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return Response.json(
      {
        error: 'Excel import failed',
        details: errorMessage,
        ...(Deno.env.get('ENV') === 'development' && { stack: errorStack })
      } as ErrorResponse,
      { status: 500 }
    );
  }
});

/**
 * Zoek de header rij die "Depot" bevat
 */
function findHeaderRow(
  rows: (string | number | boolean | null)[][]
): { headerRowIndex: number; headerRow: string[] } {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const firstCell = row[0];
    
    if (firstCell && firstCell.toString().toLowerCase().includes('depot')) {
      return {
        headerRowIndex: i,
        headerRow: row.map((cell, idx) => 
          cell ? cell.toString().trim() : `__EMPTY_${idx}`
        )
      };
    }
  }
  
  return { headerRowIndex: -1, headerRow: [] };
}

/**
 * Vind waar de data begint (na header en lege rijen)
 */
function findDataStartIndex(
  rows: (string | number | boolean | null)[][],
  headerRowIndex: number
): number {
  let dataStartIndex = headerRowIndex + 1;
  
  while (dataStartIndex < rows.length) {
    const row = rows[dataStartIndex];
    const hasValue = row.some(cell => 
      cell !== null && 
      cell !== undefined && 
      cell.toString().trim() !== ''
    );
    
    if (hasValue) {
      break;
    }
    
    dataStartIndex++;
  }
  
  return dataStartIndex;
}

/**
 * Parse data rijen naar objecten
 */
function parseDataRows(
  allRows: (string | number | boolean | null)[][],
  headerRow: string[],
  dataStartIndex: number
): ExcelRow[] {
  const data: ExcelRow[] = [];
  
  for (let i = dataStartIndex; i < allRows.length; i++) {
    const row = allRows[i];
    
    // Check of rij data bevat
    const hasValue = row.some(cell => 
      cell !== null && 
      cell !== undefined && 
      cell.toString().trim() !== ''
    );
    
    if (!hasValue) {
      break; // Stop bij eerste lege rij
    }
    
    // Skip "Totaal" rijen
    const firstCell = row[0] ? row[0].toString().trim() : '';
    if (firstCell.toLowerCase().includes('totaal')) {
      continue;
    }
    
    // Skip rijen zonder betekenisvolle data in eerste kolom
    if (!firstCell) {
      continue;
    }
    
    // Bouw row object
    const rowObj: ExcelRow = {};
    headerRow.forEach((colName, idx) => {
      const value = row[idx];
      
      // Normaliseer waarde
      if (value === null || value === undefined) {
        rowObj[colName] = '';
      } else if (typeof value === 'string') {
        rowObj[colName] = value.trim();
      } else {
        rowObj[colName] = value;
      }
    });
    
    data.push(rowObj);
  }
  
  return data;
}

/**
 * Filter kolommen die volledig leeg zijn
 */
function filterEmptyColumns(
  headerRow: string[],
  data: ExcelRow[]
): { filteredColumns: string[]; removedCount: number } {
  const nonEmptyColumns = headerRow.filter(colName => {
    // Check of kolom enige niet-lege waarde heeft
    return data.some(row => {
      const value = row[colName];
      
      if (value === null || value === undefined || value === '') {
        return false;
      }
      
      if (typeof value === 'string' && value.trim() === '') {
        return false;
      }
      
      return true;
    });
  });
  
  const removedCount = headerRow.length - nonEmptyColumns.length;
  
  return {
    filteredColumns: nonEmptyColumns,
    removedCount
  };
}