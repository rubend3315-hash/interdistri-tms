// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (Stamkaart page + Onboarding)     ║
// ║ Auth: User session (admin / HR_MANAGER only)                    ║
// ║ Generates secure link for employee to view & sign stamkaart     ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TOKEN_EXPIRY_HOURS = 72;
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const MAX_RETRIES = 3;

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendViaGmail(accessToken, to, subject, htmlBody) {
  let fromAddress = null;
  try {
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      fromAddress = profile.emailAddress;
    }
  } catch (_) {}

  const rawHeaders = [
    ...(fromAddress ? [`From: Interdistri <${fromAddress}>`] : []),
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
  ];
  const rawMessage = rawHeaders.join('\r\n') + '\r\n\r\n' + htmlBody;
  const encoded = base64UrlEncode(rawMessage);

  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${errorText}`);
  }
  return await res.json();
}

async function sendWithRetry(accessToken, to, subject, htmlBody) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await sendViaGmail(accessToken, to, subject, htmlBody);
      return { success: true, messageId: result.id, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
  return { success: false, error: lastError.message, attempts: MAX_RETRIES + 1 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin' && !['ADMIN', 'HR_MANAGER'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    const { employee_id, employee_name, employee_email, fill_onboarding_fields, onboarding_process_id } = await req.json();

    if (!employee_id || !employee_email) {
      return Response.json({ error: 'Missing employee_id or employee_email' }, { status: 400 });
    }

    console.log(`[sendStamkaartSignatureRequest] employee_id=${employee_id}, to=${employee_email}, fill_onboarding=${fill_onboarding_fields}`);

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.SecureDownloadToken.create({
      token,
      type: 'stamkaart_signature',
      employee_id,
      onboarding_process_id: onboarding_process_id || null,
      purpose: 'signature_request',
      expires_at: expiresAt,
      max_downloads: 20,
      used: false,
      download_count: 0,
      signed: false,
      fill_onboarding_fields: fill_onboarding_fields || false,
      created_by_email: user.email,
      created_by_name: user.full_name,
      shared_with_email: employee_email,
    });

    const appBaseUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const signatureUrl = `${appBaseUrl}/StamkaartSignature?token=${token}`;

    const empName = employee_name || '(medewerker)';
    const subject = `Stamkaart ter ondertekening - ${empName}`;

    const htmlBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <div style="border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:16px;">
      <strong style="font-size:16px;color:#1e293b;">Interdistri B.V.</strong>
      <span style="float:right;font-size:11px;color:#64748b;">Vertrouwelijk</span>
    </div>
    <p style="font-size:15px;color:#334155;margin:0 0 12px;">Beste ${empName},</p>
    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 16px;">
      Er staat een stamkaart (loonheffingsverklaring) klaar ter ondertekening. 
      Via onderstaande link kun je de gegevens controleren en digitaal ondertekenen.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${signatureUrl}" 
         style="display:inline-block;background:#1e40af;color:white;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
        ✍️ Stamkaart bekijken & ondertekenen
      </a>
    </div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;margin:16px 0;">
      <p style="font-size:13px;color:#1e40af;margin:0;">
        <strong>Wat moet je doen?</strong><br/>
        1. Klik op de knop hierboven<br/>
        2. Controleer je gegevens<br/>
        3. Teken onderaan met je handtekening
      </p>
    </div>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin:16px 0;">
      <p style="font-size:12px;color:#92400e;margin:0;">
        ⚠️ Deze link verloopt na ${TOKEN_EXPIRY_HOURS} uur. Onderteken zo snel mogelijk.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;margin:16px 0 0;">
      Mocht de knop niet werken:<br/>
      <a href="${signatureUrl}" style="color:#2563eb;word-break:break-all;font-size:11px;">${signatureUrl}</a>
    </p>
  </div>
  <div style="text-align:center;margin-top:16px;">
    <span style="font-size:10px;color:#94a3b8;">Dit bericht is vertrouwelijk en uitsluitend bestemd voor de geadresseerde.</span>
  </div>
</div></body></html>`;

    // Send via Gmail
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');
    const result = await sendWithRetry(accessToken, employee_email, subject, htmlBody);

    // Log email
    await base44.asServiceRole.entities.EmailLog.create({
      to: employee_email,
      subject,
      status: result.success ? 'success' : 'failed',
      source_function: 'sendStamkaartSignatureRequest',
      message_id: result.messageId || null,
      error_message: result.error || null,
      sent_at: new Date().toISOString(),
      idempotency_key: `stamkaartSignature|${employee_id}|${Date.now()}`,
    });

    // Audit log
    try {
      await base44.asServiceRole.functions.invoke('auditService', {
        entity_type: 'Employee',
        entity_id: employee_id,
        action_type: 'send',
        category: 'Medewerkers',
        description: `Stamkaart ter ondertekening verzonden naar ${employee_email}`,
        performed_by_email: user.email,
        performed_by_name: user.full_name,
        performed_by_role: user.role,
        metadata: { to: employee_email, type: 'stamkaart_signature', fill_onboarding: fill_onboarding_fields },
      });
    } catch (_) {}

    if (result.success) {
      return Response.json({ success: true, messageId: result.messageId });
    } else {
      return Response.json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error(`[sendStamkaartSignatureRequest] ERROR: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});