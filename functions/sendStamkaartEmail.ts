// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (Stamkaart page)                   ║
// ║ Auth: User session (admin only)                                  ║
// ║ DO NOT USE RAW ENTITY CALLS — USE tenantService for tenant data  ║
// ║ Do not mix user session and service role access.                 ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function replacePlaceholders(text, placeholders) {
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '—');
  }
  return result;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { to, cc, subject, body, template_key, placeholders } = await req.json();

    console.log(`[sendStamkaartEmail] DIAGNOSTIC: to=${to}, subject="${(subject || '').substring(0, 60)}", body_length=${(body || '').length}, body_empty=${!body || body.trim().length === 0}, template_key=${template_key || 'none'}`);

    // ── HARDE VALIDATIE: loonadministratie e-mailadres ──
    if (!to || typeof to !== 'string' || !to.trim().includes('@')) {
      const errorMsg = 'Geen geldig loonadministratie e-mailadres ingesteld in HR-instellingen. Ga naar HRM-instellingen → Loonadministratie.';
      console.error(`[sendStamkaartEmail] BLOCKED: ${errorMsg} (to="${to || ''}")`);

      // Log geblokkeerde verzending in EmailLog
      try {
        await base44.asServiceRole.entities.EmailLog.create({
          to: to || '(niet ingesteld)',
          subject: subject || '(geen onderwerp)',
          status: 'failed',
          source_function: 'sendStamkaartEmail',
          error_message: errorMsg,
          sent_at: new Date().toISOString(),
        });
      } catch (_) {}

      return Response.json({ success: false, error: errorMsg }, { status: 400 });
    }

    if (!subject || !body) {
      console.error(`[sendStamkaartEmail] MISSING FIELDS: subject=${!!subject}, body=${!!body}`);
      return Response.json({ error: 'Missing required fields: subject, body' }, { status: 400 });
    }

    // ── VALIDATIE: publiek e-maildomein blokkeren ──
    const BLOCKED_DOMAINS = [
      'gmail.com', 'hotmail.com', 'outlook.com', 'live.com',
      'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com',
    ];
    const toNorm = to.toLowerCase().trim();
    const toDomain = toNorm.split('@')[1];
    if (toDomain && BLOCKED_DOMAINS.includes(toDomain)) {
      const errorMsg = `Het loonadministratie-adres mag geen publiek e-maildomein zijn (${toDomain}). Gebruik een zakelijk domein. Pas dit aan in HRM-instellingen → Loonadministratie.`;
      console.error(`[sendStamkaartEmail] BLOCKED: publiek domein ${toDomain}`);
      try {
        await base44.asServiceRole.entities.EmailLog.create({
          to, subject: subject || '(geen onderwerp)', status: 'failed',
          source_function: 'sendStamkaartEmail', error_message: errorMsg,
          sent_at: new Date().toISOString(),
        });
      } catch (_) {}
      return Response.json({ success: false, error: errorMsg }, { status: 400 });
    }

    // ── VALIDATIE: 'to' mag niet gelijk zijn aan Gmail-connector of ingelogde gebruiker ──
    const currentUserEmail = (user.email || '').toLowerCase().trim();

    // Check tegen ingelogde gebruiker
    if (toNorm === currentUserEmail) {
      const errorMsg = 'Het loonadministratie-adres mag niet gelijk zijn aan uw eigen gebruikersaccount. Pas dit aan in HRM-instellingen → Loonadministratie.';
      console.error(`[sendStamkaartEmail] BLOCKED: to=${to} === currentUser=${user.email}`);
      try {
        await base44.asServiceRole.entities.EmailLog.create({
          to, subject: subject || '(geen onderwerp)', status: 'failed',
          source_function: 'sendStamkaartEmail', error_message: errorMsg,
          sent_at: new Date().toISOString(),
        });
      } catch (_) {}
      return Response.json({ success: false, error: errorMsg }, { status: 400 });
    }

    // Check tegen het gekoppelde Gmail-account (afzender)
    try {
      const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        const gmailAccount = (profile.emailAddress || '').toLowerCase().trim();
        if (gmailAccount && toNorm === gmailAccount) {
          const errorMsg = `Het loonadministratie-adres (${to}) mag niet gelijk zijn aan het gekoppelde Gmail-account (${gmailAccount}). Pas dit aan in HRM-instellingen → Loonadministratie.`;
          console.error(`[sendStamkaartEmail] BLOCKED: to=${to} === gmailConnector=${gmailAccount}`);
          try {
            await base44.asServiceRole.entities.EmailLog.create({
              to, subject: subject || '(geen onderwerp)', status: 'failed',
              source_function: 'sendStamkaartEmail', error_message: errorMsg,
              sent_at: new Date().toISOString(),
            });
          } catch (_) {}
          return Response.json({ success: false, error: errorMsg }, { status: 400 });
        }
      }
    } catch (gmailErr) {
      console.warn(`[sendStamkaartEmail] Gmail profile check failed (non-blocking): ${gmailErr.message}`);
    }

    let finalSubject = subject;
    let finalBody = body;

    if (template_key) {
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ 
        template_key, 
        is_active: true 
      });
      console.log(`[sendStamkaartEmail] Template lookup: key="${template_key}", found=${templates.length}`);
      if (templates.length > 0) {
        finalSubject = replacePlaceholders(templates[0].subject, placeholders);
        finalBody = replacePlaceholders(templates[0].body, placeholders);
        console.log(`[sendStamkaartEmail] Template applied: new subject="${finalSubject.substring(0, 60)}", new body_length=${finalBody.length}`);
      } else {
        console.log(`[sendStamkaartEmail] No active template found for key="${template_key}", using original body (length=${body.length})`);
      }
    }

    // Log address source for traceability
    console.log(`[sendStamkaartEmail] ADDRESSES: to=${to} (source=HR-settings/payroll_email), cc=${cc || '(none)'} (source=HR-settings/payroll_cc_email)`);
    console.log(`[sendStamkaartEmail] Calling mailService: finalSubject="${finalSubject.substring(0, 60)}", finalBody_length=${finalBody.length}`);

    // Generate unique idempotency key per send — includes timestamp so re-sends are NOT blocked
    const idempotencyKey = `sendStamkaartEmail|${to.toLowerCase().trim()}|${Date.now()}`;

    const result = await base44.functions.invoke('mailService', {
      to,
      cc,
      subject: finalSubject,
      html: finalBody,
      source_function: 'sendStamkaartEmail',
      idempotency_key: idempotencyKey,
    });

    // Audit log
    try {
      await base44.functions.invoke('auditService', {
        entity_type: 'Employee',
        action_type: 'send',
        category: 'Medewerkers',
        description: `Stamkaart e-mail verzonden naar ${to}`,
        performed_by_email: user.email,
        performed_by_name: user.full_name,
        performed_by_role: user.role,
        metadata: { to, subject: finalSubject },
      });
    } catch (_) {}

    return Response.json(result.data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});