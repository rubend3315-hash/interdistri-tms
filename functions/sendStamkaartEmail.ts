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

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    let finalSubject = subject;
    let finalBody = body;

    if (template_key) {
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ 
        template_key, 
        is_active: true 
      });
      if (templates.length > 0) {
        finalSubject = replacePlaceholders(templates[0].subject, placeholders);
        finalBody = replacePlaceholders(templates[0].body, placeholders);
      }
    }

    const result = await base44.functions.invoke('mailService', {
      to,
      cc,
      subject: finalSubject,
      html: finalBody,
      source_function: 'sendStamkaartEmail',
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