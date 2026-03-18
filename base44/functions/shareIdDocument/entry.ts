// redeploy: 2026-02-23T full_function_redeploy_protocol_v1 r2
// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Frontend (Onboarding Step7Summary)                    ║
// ║ Auth: Admin or HR_MANAGER only                                  ║
// ║ Purpose: Share ID document securely via download token           ║
// ║ NEVER sends document as email attachment                         ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TOKEN_EXPIRY_HOURS = 48;
const MAX_DOWNLOADS = 5;

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: Only ADMIN and HR_MANAGER
    const businessRole = user.role === 'admin' ? 'ADMIN' : (user.business_role || 'EMPLOYEE');
    if (!['ADMIN', 'HR_MANAGER'].includes(businessRole)) {
      return Response.json({ error: 'Geen toegang. Alleen Admin en HR Manager mogen ID-documenten delen.' }, { status: 403 });
    }

    const body = await req.json();
    const { document_id, employee_id, employee_name, recipient_email } = body;

    if (!document_id || !employee_id || !recipient_email) {
      return Response.json({ error: 'Missing required: document_id, employee_id, recipient_email' }, { status: 400 });
    }

    // Verify document exists and belongs to employee
    const doc = await base44.asServiceRole.entities.Document.get(document_id);
    if (!doc) {
      return Response.json({ error: 'Document niet gevonden' }, { status: 404 });
    }
    if (doc.linked_employee_id !== employee_id) {
      return Response.json({ error: 'Document is niet gekoppeld aan deze medewerker' }, { status: 403 });
    }

    // Verify it's an ID-type document
    const idDocTypes = ['Identiteitsbewijs', 'Paspoort', 'Rijbewijs'];
    if (!idDocTypes.includes(doc.document_type)) {
      return Response.json({ error: `Documenttype "${doc.document_type}" is geen ID-document` }, { status: 400 });
    }

    // Generate secure token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.SecureDownloadToken.create({
      token,
      type: 'id_document',
      employee_id,
      document_id,
      purpose: 'payroll_id_verification',
      expires_at: expiresAt,
      max_downloads: MAX_DOWNLOADS,
      used: false,
      download_count: 0,
      created_by_email: user.email,
      created_by_name: user.full_name,
      shared_with_email: recipient_email,
    });

    // Build secure download URL
    const appUrl = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/[^/]*$/, '') || '';
    const downloadUrl = `${appUrl}/SecureDownload?token=${token}`;

    // Send email with ONLY the secure link — NO attachment
    const emailHtml = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#1e293b;color:white;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:16px;">🔒 Vertrouwelijk ID-document beschikbaar</h2>
        </div>
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
          <p style="color:#334155;font-size:14px;line-height:1.6;margin-top:0;">
            Er is een identiteitsdocument gedeeld voor <strong>${employee_name || 'medewerker'}</strong>.
          </p>
          
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:16px;margin:16px 0;">
            <p style="margin:0 0 4px;font-size:13px;color:#1e40af;font-weight:600;">Documentgegevens:</p>
            <p style="margin:0;font-size:13px;color:#334155;">Type: ${doc.document_type}</p>
            <p style="margin:0;font-size:13px;color:#334155;">Naam: ${doc.name}</p>
          </div>

          <div style="text-align:center;margin:24px 0;">
            <a href="${downloadUrl}" 
               style="display:inline-block;background:#1d4ed8;color:white;padding:12px 32px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
              Document bekijken
            </a>
          </div>

          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:12px;margin:16px 0;">
            <p style="margin:0;font-size:12px;color:#92400e;font-weight:600;">⚠️ Beveiligingsinformatie:</p>
            <ul style="margin:8px 0 0;padding-left:20px;font-size:12px;color:#92400e;">
              <li>Deze link is <strong>${TOKEN_EXPIRY_HOURS} uur</strong> geldig</li>
              <li>Maximaal <strong>${MAX_DOWNLOADS} downloads</strong> toegestaan</li>
              <li>Elke download wordt geregistreerd</li>
              <li>Het document wordt NIET als bijlage meegestuurd</li>
            </ul>
          </div>

          <p style="color:#94a3b8;font-size:11px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
            Dit bericht is vertrouwelijk en uitsluitend bestemd voor de geadresseerde.
            Verzonden door ${user.full_name} via Interdistri TMS.
          </p>
        </div>
      </div>
    `;

    // Send via mailService — NO attachment
    const mailResult = await base44.functions.invoke('mailService', {
      to: recipient_email,
      subject: `Vertrouwelijk: ID-document ${employee_name || ''} — Beveiligde download`,
      html: emailHtml,
      source_function: 'shareIdDocument',
      entity_id: document_id,
    });

    // Audit log
    try {
      await base44.functions.invoke('auditService', {
        entity_type: 'Document',
        entity_id: document_id,
        action_type: 'secure_id_document_shared',
        category: 'HR',
        description: `ID-document "${doc.name}" (${doc.document_type}) veilig gedeeld met ${recipient_email} voor ${employee_name}`,
        performed_by_email: user.email,
        performed_by_name: user.full_name,
        performed_by_role: businessRole,
        target_name: employee_name,
        metadata: {
          employee_id,
          document_id,
          document_type: doc.document_type,
          shared_with_email: recipient_email,
          token_expires_at: expiresAt,
          max_downloads: MAX_DOWNLOADS,
          purpose: 'payroll_id_verification',
        },
      });
    } catch (_) {}

    return Response.json({
      success: true,
      message: `Beveiligde link verzonden naar ${recipient_email}`,
      expires_at: expiresAt,
      max_downloads: MAX_DOWNLOADS,
    });
  } catch (error) {
    console.error('shareIdDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});