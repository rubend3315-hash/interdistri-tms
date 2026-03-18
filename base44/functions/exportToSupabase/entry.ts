// redeploy: 2026-02-23T full_function_redeploy_protocol_v1
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

// Normalize rows so all have the same set of keys (PostgREST requirement)
function normalizeRows(rows) {
  if (rows.length === 0) return rows;
  const allKeys = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      allKeys.add(key);
    }
  }
  return rows.map(row => {
    const normalized = {};
    for (const key of allKeys) {
      normalized[key] = key in row ? row[key] : null;
    }
    return normalized;
  });
}

// Insert rows in batches
async function insertBatch(table, rows, batchSize = 500) {
  let inserted = 0;
  const normalized = normalizeRows(rows);
  for (let i = 0; i < normalized.length; i += batchSize) {
    const batch = normalized.slice(i, i + batchSize);
    await supabaseRequest(table, 'POST', batch);
    inserted += batch.length;
    if (i + batchSize < normalized.length) await delay(200);
  }
  return inserted;
}

// Map Base44 entity name to Supabase table name (lowercase) — all 72 entities
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
  'ClientFeatureConfig': 'clientfeatureconfig',
  'StandplaatsWerk': 'standplaatswerk',
  'Activiteit': 'activiteit',
  'Department': 'department',
  'Function': 'function',
  'PayrollSettings': 'payrollsettings',
  'EmailLog': 'emaillog',
  'Tenant': 'tenant',
  'KeylockerPincode': 'keylockerpincode',
  'SecureDownloadToken': 'securedownloadtoken',
  'UserRoleSnapshot': 'userrolesnapshot',
  'RBACDecisionLog': 'rbacdecisionlog',
  'RBACIntegrityReport': 'rbacintegrityreport',
  'MobileEntrySubmissionLog': 'mobileentrysubmissionlog',
  'MobileEntryLatencyDailyStats': 'mobileentrylatencydailystats',
  'MobileEntryPerformanceLog': 'mobileentryperformancelog',
  'ClientSubmitLog': 'clientsubmitlog',
  'MobileSubmissionIndex': 'mobilesubmissionindex',
  'WeeklyCustomerSummary': 'weeklycustomersummary',
  'WeeklyEmployeeSummary': 'weeklyemployeesummary',
  'MonthlyCustomerSummary': 'monthlycustomersummary',
  'PostNLImportArchive': 'postnlimportarchive'
};

// Known jsonb columns per table
const JSONB_COLUMNS = new Set([
  'drivers_license_categories', 'week_schedule', 'contractregels', 'reiskostenregels',
  'mileage_calibration_history', 'articles', 'column_mapping', 'data', 'calculated_data',
  'applies_to_days', 'edit_history', 'damage_photos', 'permissions', 'user_ids',
  'price_rules', 'reminder_sent_dates', 'cao_rules_applied', 'versie_geschiedenis',
  'settings', 'details', 'artikelen'
]);

// Prepare a row for Supabase insertion
function prepareRow(row) {
  const prepared = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined) continue;
    if (key === 'id') {
      prepared['base44_id'] = String(value);
      continue;
    }
    // Convert empty strings to null (fixes date/numeric columns)
    if (value === '') {
      prepared[key] = null;
      continue;
    }
    // Stringify objects/arrays for jsonb columns
    if (value !== null && typeof value === 'object') {
      prepared[key] = JSON.stringify(value);
      continue;
    }
    prepared[key] = value;
  }
  return prepared;
}

// Export a single entity to Supabase
async function exportSingleEntity(base44, entityName, tableName) {
  const columns = await fetchTableColumnNames(tableName);
  if (!columns) {
    return { status: 'skipped', reason: 'table does not exist in Supabase', count: 0 };
  }

  const data = await base44.asServiceRole.entities[entityName].list('', 10000);
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { status: 'skipped', reason: 'no data', count: 0 };
  }

  await clearTable(tableName);
  await delay(100);

  const preparedRows = data.map(row => {
    const prepared = prepareRow(row);
    return filterToColumns(prepared, columns);
  });
  
  const inserted = await insertBatch(tableName, preparedRows);
  return { status: 'success', count: inserted };
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
    // batch_index: which chunk of entities to export (0-based, 5 entities per batch)
    const batchIndex = body.batch_index ?? null;
    const BATCH_SIZE = 5;

    const allEntities = selectedEntities 
      ? Object.entries(entityToTable).filter(([e]) => selectedEntities.includes(e))
      : Object.entries(entityToTable);

    // If no batch_index given and more than BATCH_SIZE entities, return batch plan
    if (batchIndex === null && allEntities.length > BATCH_SIZE) {
      const totalBatches = Math.ceil(allEntities.length / BATCH_SIZE);
      const batches = [];
      for (let i = 0; i < totalBatches; i++) {
        const slice = allEntities.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        batches.push(slice.map(([e]) => e));
      }
      return Response.json({
        success: true,
        mode: 'batched',
        total_batches: totalBatches,
        total_entities: allEntities.length,
        batches
      });
    }

    // Determine which entities to export this call
    const entitiesToExport = batchIndex !== null
      ? allEntities.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE)
      : allEntities;

    const results = {};
    let totalExported = 0;
    const errors = [];

    for (const [entityName, tableName] of entitiesToExport) {
      try {
        await delay(200);
        console.log(`[exportToSupabase] Exporting ${entityName} → ${tableName}`);
        const result = await exportSingleEntity(base44, entityName, tableName);
        results[entityName] = result;
        totalExported += result.count || 0;
        console.log(`[exportToSupabase] ${entityName}: ${result.status} (${result.count || 0} rows)`);
      } catch (err) {
        console.error(`Export error for ${entityName}:`, err.message);
        results[entityName] = { status: 'error', error: err.message };
        errors.push({ entity: entityName, error: err.message });
      }
    }

    const totalBatches = Math.ceil(allEntities.length / BATCH_SIZE);
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      batch_index: batchIndex,
      total_batches: totalBatches,
      total_exported: totalExported,
      entity_results: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Export to Supabase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});