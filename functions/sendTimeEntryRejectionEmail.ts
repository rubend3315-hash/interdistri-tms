import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only proceed if status changed to "Afgekeurd"
    if (data?.status !== 'Afgekeurd') {
      return Response.json({ message: 'Not a rejection, skipping email' });
    }

    const timeEntryId = event.entity_id;

    // Fetch TimeEntry details
    const timeEntry = await base44.asServiceRole.entities.TimeEntry.get(timeEntryId);
    if (!timeEntry) {
      return Response.json({ error: 'TimeEntry not found' }, { status: 404 });
    }

    // Fetch Employee details
    const employee = await base44.asServiceRole.entities.Employee.get(timeEntry.employee_id);
    if (!employee || !employee.email) {
      return Response.json({ error: 'Employee email not found' }, { status: 404 });
    }

    // Fetch admin who rejected (if available)
    let adminName = 'Management';
    if (timeEntry.approved_by) {
      try {
        const adminUsers = await base44.asServiceRole.entities.User.filter({ email: timeEntry.approved_by });
        if (adminUsers && adminUsers.length > 0) {
          adminName = adminUsers[0].full_name || 'Management';
        }
      } catch (error) {
        console.log('Could not fetch admin user:', error);
      }
    }

    // Format date as DD-MM-YYYY
    const dateParts = timeEntry.date.split('-');
    const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;

    // Build email subject
    const subject = `Je ingediende dienst (${formattedDate}) is afgekeurd`;

    // Build email body
    const emailBody = `
Beste medewerker,

Een door u ingediende tijdregistratie is afgekeurd.

Reden van afkeuring:
${timeEntry.rejection_reason || 'Geen reden opgegeven'}

Wij verzoeken u de tijdregistratie aan te passen en opnieuw in te dienen.

Details van de afgekeurde dienst:
- Naam Medewerker: ${employee.first_name} ${employee.last_name}
- Datum: ${formattedDate}
- Starttijd: ${timeEntry.start_time || '-'}
- Eindtijd: ${timeEntry.end_time || '-'}
- Pauze: ${timeEntry.break_minutes || 0} minuten
- Totaal uren: ${timeEntry.total_hours || 0} uur
- Opmerkingen: ${timeEntry.notes || 'Geen opmerkingen'}

Klik hier om je dienst aan te passen:
${Deno.env.get('BASE44_APP_URL') || 'https://app.base44.com'}/edit-time-entry?id=${timeEntryId}

Alvast bedankt voor uw medewerking.

Met vriendelijke groet,
${adminName}
Interdistri
    `.trim();

    // Send email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: employee.email,
      subject: subject,
      body: emailBody
    });

    return Response.json({ 
      success: true, 
      message: `Rejection email sent to ${employee.email}` 
    });

  } catch (error) {
    console.error('Error in sendTimeEntryRejectionEmail:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});