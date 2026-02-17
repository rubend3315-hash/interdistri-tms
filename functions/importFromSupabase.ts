import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function supabaseFetch(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=10000`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase GET ${table}: ${res.status} - ${text}`);
  }
  return res.json();
}

const entityToTable = {
  'Employee': 'Employee',
  'Vehicle': 'Vehicle',
  'Customer': 'Customer',
  'Project': 'Project',
  'TimeEntry': 'TimeEntry',
  'Trip': 'Trip',
  'Schedule': 'Schedule',
  'CaoRule': 'CaoRule',
  'SalaryTable': 'SalaryTable',
  'Holiday': 'Holiday',
  'ShiftTime': 'ShiftTime',
  'VehicleInspection': 'VehicleInspection',
  'Expense': 'Expense',
  'Message': 'Message',
  'SupervisorMessage': 'SupervisorMessage',
  'NiwoPermit': 'NiwoPermit',
  'Notification': 'Notification',
  'Role': 'Role',
  'CustomerImport': 'CustomerImport',
  'Urensoort': 'Urensoort',
  'Uurcode': 'Uurcode',
  'Article': 'Article',
  'Route': 'Route',
  'TIModelRoute': 'TIModelRoute',
  'Document': 'Document',
  'Contract': 'Contract',
  'CompletedContract': 'CompletedContract',
  'ContractWijziging': 'ContractWijziging',
  'BreakSchedule': 'BreakSchedule',
  'PerformanceReview': 'PerformanceReview',
  'PerformanceNote': 'PerformanceNote',
  'EmployeeKPI': 'EmployeeKPI',
  'KPIDoel': 'KPIDoel',
  'LoonperiodeStatus': 'LoonperiodeStatus',
  'BedrijfsreglementArtikel': 'BedrijfsreglementArtikel',
  'CharterCompany': 'CharterCompany',
  'VehicleMaintenance': 'VehicleMaintenance',
  'LeaseContract': 'LeaseContract',
  'EmailTemplate': 'EmailTemplate',
  'OnboardingProcess': 'OnboardingProcess',
  'DriverAvailability': 'DriverAvailability',
  'RapportageRit': 'RapportageRit',
  'PostNLImportResult': 'PostNLImportResult',
  'SpottaInvoice': 'SpottaInvoice',
  'SpottaInvoiceLine': 'SpottaInvoiceLine',
  'ContractTemplate': 'ContractTemplate',
  'AuditLog': 'AuditLog',
  'Integration': 'Integration',
  'SyncLog': 'SyncLog',
  'Backup': 'Backup',
  'ClientFeatureConfig': 'ClientFeatureConfig'
};

// Strip built-in fields that Base44 manages
function stripBuiltInFields(row) {
  const cleaned = { ...row };
  // Keep id but remove system fields Base44 auto-manages
  delete cleaned.created_date;
  delete cleaned.updated_date;
  delete cleaned.created_by;
  return cleaned;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const confirmationCode = body.confirmation_code;
    const selectedEntities = body.entities || null; // null = all
    const selectedEntity = body.entity_name || null; // single entity

    if (confirmationCode !== 'SUPABASE-HERSTEL') {
      return Response.json({ error: 'Bevestigingscode ontbreekt of is onjuist. Gebruik: SUPABASE-HERSTEL' }, { status: 400 });
    }

    const results = {};
    let totalImported = 0;
    const errors = [];

    let entitiesToImport;
    if (selectedEntity) {
      entitiesToImport = [[selectedEntity, entityToTable[selectedEntity]]].filter(([, t]) => t);
    } else if (selectedEntities) {
      entitiesToImport = Object.entries(entityToTable).filter(([e]) => selectedEntities.includes(e));
    } else {
      entitiesToImport = Object.entries(entityToTable);
    }

    // Skip User entity - users must be re-invited manually
    entitiesToImport = entitiesToImport.filter(([e]) => e !== 'User');

    for (const [entityName, tableName] of entitiesToImport) {
      try {
        await delay(300);
        
        // Fetch data from Supabase
        const supabaseData = await supabaseFetch(tableName);
        
        if (!supabaseData || supabaseData.length === 0) {
          results[entityName] = { status: 'skipped', reason: 'no data in Supabase', count: 0 };
          continue;
        }

        // Delete existing data in Base44
        const existingData = await base44.asServiceRole.entities[entityName].list('', 10000);
        for (const item of (existingData || [])) {
          await base44.asServiceRole.entities[entityName].delete(item.id);
          await delay(50);
        }

        // Insert from Supabase into Base44
        const cleanedRows = supabaseData.map(stripBuiltInFields);
        
        // Bulk create in batches of 50
        let imported = 0;
        for (let i = 0; i < cleanedRows.length; i += 50) {
          const batch = cleanedRows.slice(i, i + 50);
          await base44.asServiceRole.entities[entityName].bulkCreate(batch);
          imported += batch.length;
          await delay(200);
        }

        results[entityName] = { status: 'success', count: imported };
        totalImported += imported;
      } catch (err) {
        console.error(`Import error for ${entityName}:`, err.message);
        results[entityName] = { status: 'error', error: err.message };
        errors.push({ entity: entityName, error: err.message });
      }
    }

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_imported: totalImported,
      entity_results: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Import from Supabase error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});