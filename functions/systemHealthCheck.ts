// refactored: 2026-02-23T v2 — health logic separated from auth
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

/**
 * Core health check logic — no auth, pure diagnostics.
 * Requires a base44 client (service role or user-scoped).
 */
async function runHealthCheck(base44) {
  const errors = [];
  let base44Connection = false;
  let supabaseConnection = false;

  // A) Base44 SDK connectivity
  try {
    const tenants = await base44.asServiceRole.entities.Tenant.list('', 1);
    base44Connection = Array.isArray(tenants);
  } catch (err) {
    errors.push({ check: 'base44_connection', error: err.message });
  }

  // B) Supabase connectivity
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/employee?select=base44_id&limit=1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    supabaseConnection = res.ok;
    if (!res.ok) {
      errors.push({ check: 'supabase_connection', error: `HTTP ${res.status}` });
    }
  } catch (err) {
    errors.push({ check: 'supabase_connection', error: err.message });
  }

  const isHealthy = base44Connection && supabaseConnection && errors.length === 0;

  return {
    status: isHealthy ? 'GREEN' : 'RED',
    version: '2026-02-23-stable',
    timestamp: new Date().toISOString(),
    base44_connection: base44Connection,
    supabase_connection: supabaseConnection,
    environment: {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_KEY
    },
    errors
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth guard — only admin users can call this endpoint directly
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const result = await runHealthCheck(base44);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});