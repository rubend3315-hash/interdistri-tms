import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { integration_id, mode } = body; // mode: "manual" or "scheduled"

    // If integration_id is provided, sync that one. Otherwise sync all active.
    let integrations = [];
    if (integration_id) {
      const all = await base44.asServiceRole.entities.Integration.filter({ id: integration_id });
      integrations = all;
    } else {
      integrations = await base44.asServiceRole.entities.Integration.filter({ is_active: true });
    }

    const results = [];

    for (const integration of integrations) {
      if (!integration.api_key || !integration.api_url) {
        await createSyncLog(base44, integration.id, integration.type, "error", 0, 0,
          "API URL of sleutel ontbreekt. Configureer deze via Instellingen.");
        await updateIntegrationStatus(base44, integration.id, "error", "API URL of sleutel ontbreekt.");
        results.push({ id: integration.id, status: "error", message: "Missing credentials" });
        continue;
      }

      try {
        let result;
        if (integration.type === "loket_nl") {
          result = await syncLoketNl(base44, integration);
        } else if (integration.type === "planning_sync") {
          result = await syncPlanning(base44, integration);
        } else {
          result = { status: "error", synced: 0, failed: 0, message: "Onbekend integratietype" };
        }

        await createSyncLog(base44, integration.id, 
          integration.type === "loket_nl" ? "verlofdagen" : "projecten",
          result.status, result.synced, result.failed, result.message);
        await updateIntegrationStatus(base44, integration.id, result.status, result.message);
        results.push({ id: integration.id, ...result });
      } catch (err) {
        const errMsg = err.message || "Onbekende fout";
        await createSyncLog(base44, integration.id,
          integration.type === "loket_nl" ? "verlofdagen" : "projecten",
          "error", 0, 0, errMsg);
        await updateIntegrationStatus(base44, integration.id, "error", errMsg);
        results.push({ id: integration.id, status: "error", message: errMsg });
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// --- Loket.nl sync: fetch leave days and update employee records ---
async function syncLoketNl(base44, integration) {
  const apiUrl = integration.api_url.replace(/\/$/, '');
  const apiKey = integration.api_key;

  // Fetch leave balances from Loket.nl
  const response = await fetch(`${apiUrl}/v2/verlof/saldi`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      status: "error",
      synced: 0,
      failed: 0,
      message: `Loket.nl API fout (${response.status}): ${errorText.substring(0, 200)}`,
    };
  }

  const data = await response.json();
  const leaveRecords = Array.isArray(data) ? data : (data.results || data.data || []);

  let synced = 0;
  let failed = 0;

  for (const record of leaveRecords) {
    try {
      // Try to match employee by employee_number or email
      const employeeNumber = record.personeelsnummer || record.employeeNumber || record.employee_number;
      if (!employeeNumber) { failed++; continue; }

      const employees = await base44.asServiceRole.entities.Employee.filter({ employee_number: employeeNumber });
      if (employees.length === 0) { failed++; continue; }

      const employee = employees[0];
      // Store leave balance info on the employee settings (or a dedicated field)
      const settings = employee.settings || {};
      settings.loket_leave_balance = {
        saldo: record.saldo || record.balance || 0,
        opgenomen: record.opgenomen || record.used || 0,
        recht: record.recht || record.entitled || 0,
        last_synced: new Date().toISOString(),
      };

      await base44.asServiceRole.entities.Employee.update(employee.id, { settings });
      synced++;
    } catch {
      failed++;
    }
  }

  return {
    status: failed === 0 ? "success" : (synced > 0 ? "partial" : "error"),
    synced,
    failed,
    message: `${synced} verlofrecords gesynchroniseerd${failed > 0 ? `, ${failed} mislukt` : ''}`,
  };
}

// --- Planning sync: fetch projects and update project records ---
async function syncPlanning(base44, integration) {
  const apiUrl = integration.api_url.replace(/\/$/, '');
  const apiKey = integration.api_key;

  const response = await fetch(`${apiUrl}/projects`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      status: "error",
      synced: 0,
      failed: 0,
      message: `Planning API fout (${response.status}): ${errorText.substring(0, 200)}`,
    };
  }

  const data = await response.json();
  const projects = Array.isArray(data) ? data : (data.results || data.data || []);

  let synced = 0;
  let failed = 0;

  for (const proj of projects) {
    try {
      const projectName = proj.name || proj.naam || proj.project_name;
      if (!projectName) { failed++; continue; }

      // Check if project already exists
      const existing = await base44.asServiceRole.entities.Project.filter({ name: projectName });

      const projectData = {
        name: projectName,
        description: proj.description || proj.omschrijving || "",
        start_date: proj.start_date || proj.startdatum || undefined,
        end_date: proj.end_date || proj.einddatum || undefined,
        status: mapProjectStatus(proj.status),
      };

      // Map customer if provided
      if (proj.customer_name || proj.klantnaam) {
        const customers = await base44.asServiceRole.entities.Customer.filter({
          company_name: proj.customer_name || proj.klantnaam
        });
        if (customers.length > 0) {
          projectData.customer_id = customers[0].id;
        }
      }

      if (existing.length > 0) {
        await base44.asServiceRole.entities.Project.update(existing[0].id, projectData);
      } else {
        // customer_id is required for Project entity
        if (!projectData.customer_id) { failed++; continue; }
        await base44.asServiceRole.entities.Project.create(projectData);
      }
      synced++;
    } catch {
      failed++;
    }
  }

  return {
    status: failed === 0 ? "success" : (synced > 0 ? "partial" : "error"),
    synced,
    failed,
    message: `${synced} projecten gesynchroniseerd${failed > 0 ? `, ${failed} mislukt` : ''}`,
  };
}

function mapProjectStatus(status) {
  if (!status) return "Actief";
  const s = String(status).toLowerCase();
  if (s.includes("actief") || s.includes("active")) return "Actief";
  if (s.includes("voltooid") || s.includes("completed") || s.includes("done")) return "Voltooid";
  if (s.includes("paus") || s.includes("hold")) return "Gepauzeerd";
  if (s.includes("cancel") || s.includes("annul")) return "Geannuleerd";
  return "Actief";
}

async function createSyncLog(base44, integrationId, syncType, status, synced, failed, message) {
  await base44.asServiceRole.entities.SyncLog.create({
    integration_id: integrationId,
    sync_type: syncType,
    status,
    records_synced: synced,
    records_failed: failed,
    message,
  });
}

async function updateIntegrationStatus(base44, integrationId, status, message) {
  await base44.asServiceRole.entities.Integration.update(integrationId, {
    last_sync: new Date().toISOString(),
    last_sync_status: status === "partial" ? "success" : status,
    last_sync_message: message,
  });
}