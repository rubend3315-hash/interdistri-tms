import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function supabaseRequest(table, method, body = null, query = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : 'return=minimal'
  };
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${table}: ${res.status} - ${text}`);
  }
  return res;
}

// Get column names from a Supabase table (returns null if table doesn't exist)
async function getTableColumns(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'count=exact'
    }
  });
  if (!res.ok) return null; // table doesn't exist
  // Parse columns from the response headers (content-profile) or use OPTIONS
  // Simpler: do an OPTIONS/HEAD or just try reading one row
  return true; // table exists
}

// Get actual columns via OpenAPI definition for a table
async function fetchTableColumnNames(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.length > 0) {
    return Object.keys(data[0]);
  }
  // If table is empty, try fetching columns from the OpenAPI spec
  const defUrl = `${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`;
  const defRes = await fetch(defUrl);
  if (!defRes.ok) return null;
  const spec = await defRes.json();
  const def = spec.definitions?.[table];
  if (def?.properties) return Object.keys(def.properties);
  return null;
}

// Delete all rows from a table
async function clearTable(table) {
  await supabaseRequest(table, 'DELETE', null, '?id=not.is.null');
}

// Filter row to only include columns that exist in the table
function filterToColumns(row, columns) {
  const filtered = {};
  for (const col of columns) {
    if (col in row) {
      filtered[col] = row[col];
    }
  }
  return filtered;
}

// Insert rows in batches
async function insertBatch(table, rows, batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await supabaseRequest(table, 'POST', batch);
    inserted += batch.length;
    if (i + batchSize < rows.length) await delay(200);
  }
  return inserted;
}

// Map Base44 entity name to Supabase table name (lowercase)
const entityToTable = {
  'Employee': 'employee',
  'Vehicle': 'vehicle',
  'Customer': 'customer',
  'Project': 'project',
  'TimeEntry': 'timeentry',
  'Trip': 'trip',
  'Schedule': 'schedule',
  'CaoRule': 'caorule',
  'SalaryTable': 'salarytable',
  'Holiday': 'holiday',
  'ShiftTime': 'shifttime',
  'VehicleInspection': 'vehicleinspection',
  'Expense': 'expense',
  'Message': 'message',
  'SupervisorMessage': 'supervisormessage',
  'NiwoPermit': 'niwopermit',
  'Notification': 'notification',
  'Role': 'role',
  'CustomerImport': 'customerimport',
  'Urensoort': 'urensoort',
  'Uurcode': 'uurcode',
  'Article': 'article',
  'Route': 'route',
  'TIModelRoute': 'timodelroute',
  'Document': 'document',
  'Contract': 'contract',
  'CompletedContract': 'completedcontract',
  'ContractWijziging': 'contractwijziging',
  'BreakSchedule': 'breakschedule',
  'PerformanceReview': 'performancereview',
  'PerformanceNote': 'performancenote',
  'EmployeeKPI': 'employeekpi',
  'KPIDoel': 'kpidoel',
  'LoonperiodeStatus': 'loonperiodestatus',
  'BedrijfsreglementArtikel': 'bedrijfsreglementartikel',
  'CharterCompany': 'chartercompany',
  'VehicleMaintenance': 'vehiclemaintenance',
  'LeaseContract': 'leasecontract',
  'EmailTemplate': 'emailtemplate',
  'OnboardingProcess': 'onboardingprocess',
  'DriverAvailability': 'driveravailability',
  'RapportageRit': 'rapportagerit',
  'PostNLImportResult': 'postnlimportresult',
  'SpottaInvoice': 'spottainvoice',
  'SpottaInvoiceLine': 'spottainvoiceline',
  'ContractTemplate': 'contracttemplate',
  'AuditLog': 'auditlog',
  'Integration': 'integration',
  'SyncLog': 'synclog',
  'Backup': 'backup',
  'ClientFeatureConfig': 'clientfeatureconfig'
};

// Flatten nested objects/arrays to JSON strings for Supabase columns that expect JSONB/TEXT
function prepareRow(row) {
  const prepared = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object') {
      prepared[key] = JSON.stringify(value);
    } else {
      prepared[key] = value;
    }
  }
  return prepared;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const selectedEntities = body.entities || null; // null = all

    const results = {};
    let totalExported = 0;
    const errors = [];

    const entitiesToExport = selectedEntities 
      ? Object.entries(entityToTable).filter(([e]) => selectedEntities.includes(e))
      : Object.entries(entityToTable);

    for (const [entityName, tableName] of entitiesToExport) {
      try {
        await delay(300);
        const data = await base44.asServiceRole.entities[entityName].list('', 10000);
        
        if (!data || data.length === 0) {
          results[entityName] = { status: 'skipped', reason: 'no data', count: 0 };
          continue;
        }

        // Clear existing data in Supabase table
        await clearTable(tableName);
        await delay(100);

        // Prepare and insert rows
        const preparedRows = data.map(prepareRow);
        const inserted = await insertBatch(tableName, preparedRows);
        
        results[entityName] = { status: 'success', count: inserted };
        totalExported += inserted;
      } catch (err) {
        console.error(`Export error for ${entityName}:`, err.message);
        results[entityName] = { status: 'error', error: err.message };
        errors.push({ entity: entityName, error: err.message });
      }
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_exported: totalExported,
      entity_results: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Export to Supabase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});