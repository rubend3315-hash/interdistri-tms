// Debug: inspect Naiton users to see what fields are available for employee matching
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BASE_URL = 'https://dawa-prod.naiton.com';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const CLIENT_ID = Deno.env.get('NAITON_CLIENT_ID');
    const CLIENT_SECRET = Deno.env.get('NAITON_CLIENT_SECRET');

    const res = await fetch(`${BASE_URL}/datad/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ClientId': CLIENT_ID, 'ClientSecret': CLIENT_SECRET },
      body: JSON.stringify([{ name: "dataexchange_users" }]),
    });
    const json = await res.json();
    const users = json.dataexchange_users || [];

    // Show all fields from first user
    const allFields = users.length > 0 ? Object.keys(users[0]) : [];
    
    // For each user, show key identification fields
    const userSummary = users.map(u => ({
      firstname: u.firstname,
      lastname: u.lastname,
      staffnumber: u.staffnumber,
      employeenumber: u.employeenumber,
      personnumber: u.personnumber,
      personid: u.personid,
      tachocardnumber: u.tachocardnumber,
      tagid: u.tagid,
      // Show ALL non-null fields that might contain employee number
      ...Object.fromEntries(
        Object.entries(u).filter(([k, v]) => 
          v !== null && v !== undefined && v !== '' && 
          /number|nummer|staff|person|emp|id|code/i.test(k)
        )
      ),
    }));

    // Count how many have staffnumber/employeenumber
    const withStaff = users.filter(u => u.staffnumber).length;
    const withEmpNr = users.filter(u => u.employeenumber).length;
    const withPersonNr = users.filter(u => u.personnumber).length;

    return Response.json({
      total_users: users.length,
      all_fields: allFields,
      with_staffnumber: withStaff,
      with_employeenumber: withEmpNr,
      with_personnumber: withPersonNr,
      users: userSummary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});