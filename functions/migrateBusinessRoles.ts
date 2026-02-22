// Enterprise RBAC Migration - business_role toewijzing
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Haal alle gebruikers op via service role
    const allUsers = await base44.asServiceRole.entities.User.list();
    
    let migrated = 0;
    let skipped = 0;
    const results = [];

    for (const u of allUsers) {
      // Skip als business_role al is ingesteld
      if (u.business_role) {
        skipped++;
        results.push({ email: u.email, action: 'skipped', reason: 'already has business_role', business_role: u.business_role });
        continue;
      }

      // Admin system role → ADMIN business role
      // Alle anderen → EMPLOYEE
      const newRole = u.role === 'admin' ? 'ADMIN' : 'EMPLOYEE';
      
      await base44.asServiceRole.entities.User.update(u.id, { business_role: newRole });
      migrated++;
      results.push({ email: u.email, action: 'migrated', business_role: newRole });
    }

    return Response.json({
      success: true,
      total: allUsers.length,
      migrated,
      skipped,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});