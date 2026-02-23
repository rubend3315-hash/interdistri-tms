// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Admin via frontend (Stamkaart page + Onboarding)     ║
// ║ Auth: User session (admin only)                                  ║
// ║ SECURITY UPGRADE: No longer sends BSN/IBAN in email body.       ║
// ║ Instead generates a secure download token and sends a link.     ║
// ║ Sends email directly via Gmail API (no mailService invoke).     ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TOKEN_EXPIRY_HOURS = 48;
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const MAX_RETRIES = 3;

function replacePlaceholders(text, placeholders) {
  let result = text;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '—');
  }
  return result;
}

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
  const encoded = btoa(binary);
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendViaGmail(accessToken, to, cc, subject, htmlBody) {
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
    ...(cc ? [`Cc: ${cc}`] : []),
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
  ];
  const rawMessage = rawHeaders.join('\r\n') + '\r\n\r\n' + htmlBody;
  const encoded = base64UrlEncode(rawMessage);

  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gmail API error (${res.status}): ${errorText}`);
  }

  const responseData = await res.json();
  if (!responseData.id) {
    throw new Error(`Gmail returned no messageId: ${JSON.stringify(responseData)}`);
  }
  return responseData;
}

async function sendWithRetry(accessToken, to, cc, subject, htmlBody) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await sendViaGmail(accessToken, to, cc, subject, htmlBody);
      return { success: true, messageId: result.id, attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
      }
    }
  }
  return { success: false, error: lastError.message, attempts: MAX_RETRIES + 1 };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // RBAC: ADMIN, HR_MANAGER
    if (user.role !== 'admin' && !['ADMIN', 'HR_MANAGER'].includes(user.business_role)) {
      return Response.json({ error: 'Forbidden: insufficient business role' }, { status: 403 });
    }

    const { to, cc, subject, employee_id, employee_name, download_type, template_key, placeholders } = await req.json();

    console.log(`[sendStamkaartEmail] SECURE MODE: to=${to}, employee_id=${employee_id}, type=${download_type || 'stamkaart'}`);

    // ── HARDE VALIDATIE: loonadministratie e-mailadres ──
    if (!to || typeof to !== 'string' || !to.trim().includes('@')) {
      const errorMsg = 'Geen geldig loonadministratie e-mailadres ingesteld in HR-instellingen.';
      console.error(`[sendStamkaartEmail] BLOCKED: ${errorMsg}`);
      try {
        await base44.asServiceRole.entities.EmailLog.create({
          to: to || '(niet ingesteld)', subject: subject || '(geen onderwerp)',
          status: 'failed', source_function: 'sendStamkaartEmail',
          error_message: errorMsg, sent_at: new Date().toISOString(),
        });
      } catch (_) {}
      return Response.json({ success: false, error: errorMsg }, { status: 400 });
    }

    if (!subject) {
      return Response.json({ error: 'Missing required field: subject' }, { status: 400 });
    }

    if (!employee_id) {
      return Response.json({ error: 'Missing required field: employee_id' }, { status: 400 });
    }

    // ── VALIDATIE: publiek e-maildomein blokkeren ──
    const BLOCKED_DOMAINS = [
      'gmail.com', 'hotmail.com', 'outlook.com', 'live.com',
      'yahoo.com', 'icloud.com', 'proton.me', 'protonmail.com',
    ];
    const toNorm = to.toLowerCase().trim();
    const toDomain = toNorm.split('@')[1];
    if (toDomain && BLOCKED_DOMAINS.includes(toDomain)) {
      const errorMsg = `Het loonadministratie-adres mag geen publiek e-maildomein zijn (${toDomain}).`;
      console.error(`[sendStamkaartEmail] BLOCKED: publiek domein ${toDomain}`);
      try {
        await base44.asServiceRole.entities.EmailLog.create({
          to, subject, status: 'failed',
          source_function: 'sendStamkaartEmail', error_message: errorMsg,
          sent_at: new Date().toISOString(),
        });
      } catch (_) {}
      return Response.json({ success: false, error: errorMsg }, { status: 400 });
    }

    // ── VALIDATIE: to ≠ eigen account ──
    const currentUserEmail = (user.email || '').toLowerCase().trim();
    if (toNorm === currentUserEmail) {
      const errorMsg = 'Het loonadministratie-adres mag niet gelijk zijn aan uw eigen gebruikersaccount.';
      try {
        await base44.asServiceRole.entities.EmailLog.create({
          to, subject, status: 'failed', source_function: 'sendStamkaartEmail',
          error_message: errorMsg, sent_at: new Date().toISOString(),
        });
      } catch (_) {}
      return Response.json({ success: false, error: errorMsg }, { status: 400 });
    }

    // Get Gmail token early — needed for profile check + sending
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('gmail');

    // ── VALIDATIE: to ≠ Gmail connector account ──
    try {
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        const gmailAccount = (profile.emailAddress || '').toLowerCase().trim();
        if (gmailAccount && toNorm === gmailAccount) {
          const errorMsg = `Het loonadministratie-adres mag niet gelijk zijn aan het gekoppelde Gmail-account.`;
          try {
            await base44.asServiceRole.entities.EmailLog.create({
              to, subject, status: 'failed', source_function: 'sendStamkaartEmail',
              error_message: errorMsg, sent_at: new Date().toISOString(),
            });
          } catch (_) {}
          return Response.json({ success: false, error: errorMsg }, { status: 400 });
        }
      }
    } catch (gmailErr) {
      console.warn(`[sendStamkaartEmail] Gmail profile check failed: ${gmailErr.message}`);
    }

    // ── GENERATE SECURE DOWNLOAD TOKEN ──
    const type = download_type || 'stamkaart';
    const downloadToken = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.SecureDownloadToken.create({
      token: downloadToken,
      type,
      employee_id,
      expires_at: expiresAt,
      max_downloads: 5,
      used: false,
      download_count: 0,
      created_by_email: user.email,
      created_by_name: user.full_name,
    });

    const appBaseUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const secureDownloadUrl = `${appBaseUrl}/SecureDownload?token=${downloadToken}`;

    console.log(`[sendStamkaartEmail] Token generated, URL: ${secureDownloadUrl}`);

    // ── BUILD SECURE EMAIL BODY ──
    const empName = employee_name || '(medewerker)';
    const typeLabel = type === 'onboarding' ? 'onboarding dossier' : 'stamkaart';
    
    let finalSubject = subject;
    let finalBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;">
<div style="max-width:600px;margin:0 auto;padding:32px 16px;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
    <div style="border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:16px;">
      <strong style="font-size:16px;color:#1e293b;">Interdistri B.V.</strong>
      <span style="float:right;font-size:11px;color:#64748b;">Vertrouwelijk</span>
    </div>
    <p style="font-size:14px;color:#334155;margin:0 0 16px;">
      De ${typeLabel} van <strong>${empName}</strong> is beschikbaar via onderstaande beveiligde link.
    </p>
    <p style="font-size:13px;color:#475569;margin:0 0 16px;">
      Deze link verloopt automatisch na 48 uur. Klik op de knop om het document veilig te openen.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${secureDownloadUrl}" 
         style="display:inline-block;background:#1e40af;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
        📄 ${type === 'onboarding' ? 'Onboarding dossier' : 'Stamkaart'} openen
      </a>
    </div>
    <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px;margin:16px 0;">
      <p style="font-size:12px;color:#92400e;margin:0;">
        ⚠️ <strong>Beveiligingsmelding:</strong> Dit document bevat vertrouwelijke persoonsgegevens. 
        Deel deze link niet met onbevoegden. De link is maximaal 5 keer te gebruiken.
      </p>
    </div>
    <p style="font-size:11px;color:#94a3b8;margin:16px 0 0;">
      Mocht de knop niet werken, kopieer dan deze link:<br/>
      <a href="${secureDownloadUrl}" style="color:#2563eb;word-break:break-all;font-size:11px;">${secureDownloadUrl}</a>
    </p>
  </div>
  <div style="text-align:center;margin-top:16px;">
    <span style="font-size:10px;color:#94a3b8;">Dit bericht is vertrouwelijk en uitsluitend bestemd voor de geadresseerde.</span>
  </div>
</div>
</body></html>`;

    // Check for custom template
    if (template_key && placeholders) {
      const templates = await base44.asServiceRole.entities.EmailTemplate.filter({ 
        template_key, is_active: true 
      });
      if (templates.length > 0) {
        const allPlaceholders = { 
          ...placeholders, 
          secure_download_url: secureDownloadUrl,
          download_link: `<a href="${secureDownloadUrl}" style="display:inline-block;background:#1e40af;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">📄 Document openen</a>`,
        };
        finalSubject = replacePlaceholders(templates[0].subject, allPlaceholders);
        finalBody = replacePlaceholders(templates[0].body, allPlaceholders);
      }
    }

    // ── BUILD CC LIST ──
    const ccList = cc ? String(cc).split(',').map(e => e.trim().toLowerCase()).filter(e => e && e !== toNorm).join(', ') : '';

    // ── CREATE EMAIL LOG ──
    const logEntry = await base44.asServiceRole.entities.EmailLog.create({
      to,
      cc: ccList,
      subject: finalSubject,
      status: 'sending',
      source_function: 'sendStamkaartEmail',
      sent_at: new Date().toISOString(),
      idempotency_key: `sendStamkaartEmail|${toNorm}|${Date.now()}`,
    });

    // ── SEND VIA GMAIL API DIRECTLY ──
    const result = await sendWithRetry(accessToken, to, ccList, finalSubject, finalBody);

    if (result.success) {
      await base44.asServiceRole.entities.EmailLog.update(logEntry.id, {
        status: 'success',
        message_id: result.messageId,
        retry_count: result.attempts - 1,
        sent_at: new Date().toISOString(),
      });

      console.log(`[sendStamkaartEmail] SUCCESS messageId=${result.messageId}`);

      // Audit log
      try {
        await base44.asServiceRole.functions.invoke('auditService', {
          entity_type: 'Employee',
          entity_id: employee_id,
          action_type: 'send',
          category: 'Medewerkers',
          description: `Stamkaart beveiligde link verzonden naar ${to} (${typeLabel})`,
          performed_by_email: user.email,
          performed_by_name: user.full_name,
          performed_by_role: user.role,
          metadata: { to, subject: finalSubject, type, secure: true },
        });
      } catch (_) {}

      return Response.json({
        success: true,
        messageId: result.messageId,
        logId: logEntry.id,
      });
    } else {
      await base44.asServiceRole.entities.EmailLog.update(logEntry.id, {
        status: 'failed',
        error_message: result.error?.substring(0, 500),
        retry_count: result.attempts - 1,
      });

      console.error(`[sendStamkaartEmail] FAILED: ${result.error}`);
      return Response.json({
        success: false,
        error: result.error,
        logId: logEntry.id,
      });
    }
  } catch (error) {
    console.error(`[sendStamkaartEmail] ERROR: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});