import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    // Get all RapportageRit records with wrong klant_id
    const allRits = await base44.asServiceRole.entities.RapportageRit.list();
    
    // Get PostNL customer ID
    const customers = await base44.asServiceRole.entities.Customer.list();
    const postNLCustomer = customers.find(c => c.company_name === 'PostNL');
    
    if (!postNLCustomer) {
      return Response.json({ error: 'PostNL customer not found' }, { status: 400 });
    }

    // Fix records with wrong klant_id
    const toFix = allRits.filter(r => r.klant_id === '697fb7eb67b414a90f8508d7');
    
    if (toFix.length === 0) {
      return Response.json({ message: 'No records to fix' });
    }

    for (const rit of toFix) {
      await base44.asServiceRole.entities.RapportageRit.update(rit.id, {
        klant_id: postNLCustomer.id
      });
    }

    return Response.json({ 
      success: true, 
      fixed: toFix.length,
      postNLCustomerId: postNLCustomer.id
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});