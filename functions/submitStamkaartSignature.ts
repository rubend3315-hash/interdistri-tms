// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: PUBLIC (no auth required)                        ║
// ║ Called by: StamkaartSignature page (employee via secure link)   ║
// ║ Actions:                                                        ║
// ║   - validate: Check token validity + return employee data       ║
// ║   - sign: Save signature to employee + onboarding fields        ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENC_PREFIX = 'enc:v1:';
const ALGORITHM = 'AES-GCM';

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function getKey() {
  const keyHex = Deno.env.get('APP_ENCRYPTION_KEY');
  if (!keyHex || keyHex.length !== 64) throw new Error('APP_ENCRYPTION_KEY not set');
  return await crypto.subtle.importKey('raw', hexToBytes(keyHex), { name: ALGORITHM }, false, ['decrypt']);
}

async function decrypt(ciphertext) {
  if (!ciphertext || !ciphertext.startsWith(ENC_PREFIX)) return ciphertext;
  const key = await getKey();
  const parts = ciphertext.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 2) return ciphertext;
  const iv = hexToBytes(parts[0]);
  const cipherBytes = hexToBytes(parts[1]);
  const buf = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, cipherBytes);
  return new TextDecoder().decode(buf);
}

function maskBSN(bsn) {
  if (!bsn || bsn.length < 4) return '***';
  return '***' + bsn.slice(-3);
}

function maskIBAN(iban) {
  if (!iban || iban.length < 6) return '****';
  return iban.slice(0, 4) + ' **** **** ' + iban.slice(-4);
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  } catch { return val; }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, token } = body;

    if (!token) return Response.json({ error: 'Missing token' }, { status: 400 });

    const svc = base44.asServiceRole;

    // Find token
    let tokens = [];
    try {
      tokens = await svc.entities.SecureDownloadToken.filter({ token });
    } catch (_) {
      const allTokens = await svc.entities.SecureDownloadToken.list('-created_date', 200);
      tokens = allTokens.filter(t => t.token === token);
    }

    if (tokens.length === 0) {
      return Response.json({ error: 'Token niet gevonden of ongeldig' }, { status: 404 });
    }

    const tokenRecord = tokens[0];

    if (tokenRecord.type !== 'stamkaart_signature') {
      return Response.json({ error: 'Ongeldig token type' }, { status: 400 });
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
      return Response.json({ error: 'Deze link is verlopen. Vraag een nieuwe link aan bij uw contactpersoon.' }, { status: 410 });
    }

    // ── VALIDATE: Return employee data for display ──
    if (action === 'validate') {
      if (tokenRecord.signed) {
        return Response.json({ error: 'Dit document is al ondertekend.', already_signed: true, signature_url: tokenRecord.signature_url }, { status: 409 });
      }

      // Increment view count
      await svc.entities.SecureDownloadToken.update(tokenRecord.id, {
        download_count: (tokenRecord.download_count || 0) + 1,
        used: true,
      });

      // Fetch employee
      const emp = await svc.entities.Employee.get(tokenRecord.employee_id);
      if (!emp) return Response.json({ error: 'Medewerker niet gevonden' }, { status: 404 });

      // Decrypt sensitive fields
      let bsnDecrypted = emp.bsn ? await decrypt(emp.bsn) : '';
      let ibanDecrypted = emp.bank_account ? await decrypt(emp.bank_account) : '';

      // Derive contract info from contractregels
      const activeRegel = (emp.contractregels || [])
        .filter(r => r.status !== 'Inactief' && r.status !== 'Beëindigd')
        .sort((a, b) => new Date(b.startdatum) - new Date(a.startdatum))[0];

      // Build safe employee data — mask BSN and IBAN for display
      const safeEmployee = {
        first_name: emp.first_name,
        prefix: emp.prefix,
        last_name: emp.last_name,
        initials: emp.initials,
        date_of_birth: emp.date_of_birth,
        address: emp.address,
        postal_code: emp.postal_code,
        city: emp.city,
        email: emp.email,
        phone: emp.phone,
        bsn_masked: maskBSN(bsnDecrypted),
        iban_masked: maskIBAN(ibanDecrypted),
        emergency_contact_name: emp.emergency_contact_name,
        emergency_contact_phone: emp.emergency_contact_phone,
        id_document_number: emp.id_document_number,
        id_document_expiry: emp.id_document_expiry,
        drivers_license_number: emp.drivers_license_number,
        drivers_license_categories: emp.drivers_license_categories,
        drivers_license_expiry: emp.drivers_license_expiry,
        code95_expiry: emp.code95_expiry,
        in_service_since: emp.in_service_since,
        department: emp.department,
        function: emp.function,
        salary_scale: emp.salary_scale,
        hourly_rate: emp.hourly_rate,
        employee_number: emp.employee_number,
        contract_type: activeRegel?.type_contract || '',
        contract_hours: activeRegel?.uren_per_week || '',
        loonheffing_toepassen: emp.loonheffing_toepassen,
        loonheffing_datum: emp.loonheffing_datum,
      };

      return Response.json({
        success: true,
        employee: safeEmployee,
        fill_onboarding_fields: tokenRecord.fill_onboarding_fields,
        employee_name: `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim(),
      });
    }

    // ── SIGN: Save signature ──
    if (action === 'sign') {
      if (tokenRecord.signed) {
        return Response.json({ error: 'Dit document is al ondertekend.' }, { status: 409 });
      }

      const { signature_data_url } = body;
      if (!signature_data_url) {
        return Response.json({ error: 'Geen handtekening meegegeven' }, { status: 400 });
      }

      // Upload signature image
      const response = await fetch(signature_data_url);
      const blob = await response.blob();

      // Use integrations to upload
      const uploadResult = await svc.integrations.Core.UploadFile({
        file: new File([blob], `handtekening_stamkaart_${tokenRecord.employee_id}.jpg`, { type: 'image/jpeg' }),
      });
      const signatureUrl = uploadResult.file_url;

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

      // 1. Update employee with signature
      await svc.entities.Employee.update(tokenRecord.employee_id, {
        loonheffing_handtekening_url: signatureUrl,
      });

      // 2. If fill_onboarding_fields, update onboarding process too
      if (tokenRecord.fill_onboarding_fields) {
        // Find onboarding process by ID or employee_id
        let processes = [];
        if (tokenRecord.onboarding_process_id) {
          try {
            const proc = await svc.entities.OnboardingProcess.get(tokenRecord.onboarding_process_id);
            if (proc) processes = [proc];
          } catch (_) {}
        }
        if (processes.length === 0) {
          processes = await svc.entities.OnboardingProcess.filter({ employee_id: tokenRecord.employee_id });
        }

        if (processes.length > 0) {
          const proc = processes[processes.length - 1]; // most recent
          await svc.entities.OnboardingProcess.update(proc.id, {
            employee_signature_url: signatureUrl,
            stamkaart_completed: true,
          });
        }
      }

      // 3. Mark token as signed
      await svc.entities.SecureDownloadToken.update(tokenRecord.id, {
        signed: true,
        signed_at: new Date().toISOString(),
        signature_url: signatureUrl,
        ip_address: ip,
      });

      // 4. Audit log
      try {
        await svc.entities.AuditLog.create({
          action_type: 'sign',
          category: 'Medewerkers',
          description: `Stamkaart digitaal ondertekend via secure link door ${tokenRecord.shared_with_email || 'medewerker'}`,
          performed_by_email: tokenRecord.shared_with_email || 'external',
          metadata: {
            employee_id: tokenRecord.employee_id,
            token_id: tokenRecord.id,
            ip,
            fill_onboarding: tokenRecord.fill_onboarding_fields,
          },
        });
      } catch (_) {}

      // 5. Notify admin via email
      try {
        const emp = await svc.entities.Employee.get(tokenRecord.employee_id);
        const empName = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
        
        if (tokenRecord.created_by_email) {
          await svc.functions.invoke('mailService', {
            to: tokenRecord.created_by_email,
            subject: `Stamkaart ondertekend - ${empName}`,
            html: `<p>De stamkaart van <strong>${empName}</strong> is digitaal ondertekend via de beveiligde link.</p><p>De handtekening is automatisch opgeslagen op de medewerkerkaart.</p>`,
            source_function: 'submitStamkaartSignature',
            skip_auth: true,
          });
        }
      } catch (mailErr) {
        console.warn(`[submitStamkaartSignature] Admin notification failed: ${mailErr.message}`);
      }

      return Response.json({ success: true, signature_url: signatureUrl });
    }

    return Response.json({ error: 'Unknown action. Use: validate, sign' }, { status: 400 });
  } catch (error) {
    console.error(`[submitStamkaartSignature] ERROR: ${error.message}`);
    return Response.json({ error: error.message }, { status: 500 });
  }
});