// Scheduled reminder for missing time entries
// Runs daily at 19:05 — checks last 3 days for employees with GPS trips but no TimeEntry
// Sends reminder email via Gmail connector with CC to ruben@interdistri.nl
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DAYS_BACK = 3;
const CC_EMAILS = ['ruben@interdistri.nl', 'martien@interdistri.nl'];

async function paginatedFilter(entity, query, sort = '-created_date') {
  const all = [];
  let skip = 0;
  const PAGE = 20;
  while (true) {
    const page = await entity.filter(query, sort, PAGE, skip);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE) break;
    skip += PAGE;
  }
  return all;
}

function formatDateNL(dateStr) {
  const d = new Date(dateStr);
  const days = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
  const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(fromDate.getDate() - DAYS_BACK);
    const fmt = (d) => d.toISOString().split('T')[0];
    const dateFrom = fmt(fromDate);
    const dateTo = fmt(today);

    console.log(`[MISSING ENTRY REMINDER] Checking ${dateFrom} → ${dateTo}`);

    // Fetch TripRecordLinks (GPS ride → employee associations)
    const tripLinks = await paginatedFilter(svc.entities.TripRecordLink, {
      date: { $gte: dateFrom, $lte: dateTo },
    });
    console.log(`[MISSING ENTRY REMINDER] ${tripLinks.length} trip links found`);

    if (tripLinks.length === 0) {
      return Response.json({ success: true, message: 'Geen trip links gevonden', sent: 0 });
    }

    // Fetch TimeEntries for the period
    const timeEntries = await paginatedFilter(svc.entities.TimeEntry, {
      date: { $gte: dateFrom, $lte: dateTo },
    });

    // Build set of employee_id+date that have a submitted TimeEntry
    const submittedSet = new Set();
    for (const te of timeEntries) {
      if (te.employee_id && te.date && te.status !== 'Concept') {
        submittedSet.add(`${te.employee_id}_${te.date}`);
        if (te.end_date && te.end_date !== te.date) {
          submittedSet.add(`${te.employee_id}_${te.end_date}`);
        }
      }
    }

    // Group links by employee_id, filter out those with submitted entries
    const missingByEmployee = {};
    for (const link of tripLinks) {
      if (!link.employee_id || !link.date) continue;
      const key = `${link.employee_id}_${link.date}`;
      if (submittedSet.has(key)) continue;
      if (!missingByEmployee[link.employee_id]) missingByEmployee[link.employee_id] = new Set();
      missingByEmployee[link.employee_id].add(link.date);
    }

    const employeeIds = Object.keys(missingByEmployee);
    if (employeeIds.length === 0) {
      console.log('[MISSING ENTRY REMINDER] Alle diensten ingevuld!');
      return Response.json({ success: true, message: 'Alle diensten ingevuld', sent: 0 });
    }

    // Fetch employee details
    const employees = await paginatedFilter(svc.entities.Employee, { status: 'Actief' });
    const empMap = {};
    for (const emp of employees) {
      empMap[emp.id] = emp;
    }

    // Get Gmail access token
    const { accessToken } = await svc.connectors.getConnection('gmail');

    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const empId of employeeIds) {
      const emp = empMap[empId];
      if (!emp || !emp.email) {
        skipped++;
        continue;
      }

      const missingDates = [...missingByEmployee[empId]].sort();
      const datesStr = missingDates.map(d => formatDateNL(d)).join(', ');
      const count = missingDates.length;

      const subject = `Herinnering: ${count} ${count === 1 ? 'dag' : 'dagen'} niet ingevuld`;
      const body = `<p>Beste ${emp.first_name || emp.last_name},</p>
<p>Volgens onze GPS-registratie heb je op de volgende ${count === 1 ? 'dag' : 'dagen'} gereden maar nog geen tijdregistratie ingediend:</p>
<p><strong>${datesStr}</strong></p>
<p>Wil je dit zo snel mogelijk invullen via de mobiele app?</p>
<p>Met vriendelijke groet,<br/>Interdistri TMS</p>`;

      // Build RFC 2822 MIME message
      const mimeLines = [
        `From: me`,
        `To: ${emp.email}`,
        `Cc: ${CC_EMAILS.join(', ')}`,
        `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset="UTF-8"`,
        `Content-Transfer-Encoding: base64`,
        ``,
        btoa(unescape(encodeURIComponent(body))),
      ];
      const rawMessage = mimeLines.join('\r\n');
      const encodedMessage = btoa(rawMessage)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      try {
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw: encodedMessage }),
        });

        if (res.ok) {
          sent++;
          console.log(`[MISSING ENTRY REMINDER] Mail sent to ${emp.first_name} ${emp.last_name} (${emp.email}) for ${count} dagen`);
        } else {
          const errText = await res.text();
          errors.push(`${emp.email}: ${errText.slice(0, 200)}`);
          console.error(`[MISSING ENTRY REMINDER] Gmail error for ${emp.email}:`, errText.slice(0, 300));
        }
      } catch (e) {
        errors.push(`${emp.email}: ${e.message}`);
        console.error(`[MISSING ENTRY REMINDER] Error sending to ${emp.email}:`, e.message);
      }
    }

    console.log(`[MISSING ENTRY REMINDER] Done: ${sent} sent, ${skipped} skipped, ${errors.length} errors`);

    return Response.json({
      success: true,
      period: { from: dateFrom, to: dateTo },
      employees_missing: employeeIds.length,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[MISSING ENTRY REMINDER] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});