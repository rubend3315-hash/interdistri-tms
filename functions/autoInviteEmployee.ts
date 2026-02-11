import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const body = await req.json();
    const { event, data } = body;

    // Only process create and update events
    if (!event || !['create', 'update'].includes(event.type)) {
      return Response.json({ status: 'skipped', reason: 'not a create/update event' });
    }

    // Check if employee has an email
    const employeeEmail = data?.email;
    if (!employeeEmail) {
      return Response.json({ status: 'skipped', reason: 'no email on employee' });
    }

    // Check if employee status is active
    if (data.status && data.status !== 'Actief') {
      return Response.json({ status: 'skipped', reason: 'employee not active' });
    }

    // Check if a user with this email already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: employeeEmail });
    if (existingUsers && existingUsers.length > 0) {
      return Response.json({ status: 'skipped', reason: 'user already exists' });
    }

    // Invite the employee as a user with role 'user' (Medewerker)
    await base44.asServiceRole.users.inviteUser(employeeEmail, 'user');

    console.log(`Medewerker ${data.first_name} ${data.last_name} (${employeeEmail}) uitgenodigd als gebruiker.`);

    return Response.json({ 
      status: 'success', 
      message: `Gebruiker uitgenodigd: ${employeeEmail}` 
    });
  } catch (error) {
    console.error('Error in autoInviteEmployee:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});