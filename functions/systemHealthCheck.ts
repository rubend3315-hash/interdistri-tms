import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  const errors = [];
  let base44Connection = false;
  let supabaseConnection = false;

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

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

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      base44_connection: base44Connection,
      supabase_connection: supabaseConnection,
      environment: {
        SUPABASE_URL: !!SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_KEY
      },
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});