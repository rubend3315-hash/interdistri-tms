// redeploy: 2026-02-23T full_function_redeploy_protocol_v1
// ╔══════════════════════════════════════════════════════════════════╗
// ║ FUNCTION TYPE: USER_FACING                                      ║
// ║ Called by: Frontend (secure download page) + Admin (token gen)   ║
// ║ Actions:                                                         ║
// ║   - generate: Admin creates a secure download token              ║
// ║   - download: Anyone with valid token downloads the document     ║
// ╚══════════════════════════════════════════════════════════════════╝
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ENC_PREFIX = 'enc:v1:';
const ALGORITHM = 'AES-GCM';
const TOKEN_EXPIRY_HOURS = 48;

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

function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  } catch { return val; }
}

function buildStamkaartHtml(emp, lhData) {
  const cats = Array.isArray(emp.drivers_license_categories)
    ? emp.drivers_license_categories.join(', ')
    : (emp.drivers_license_categories || '—');
  const fullName = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
  const printDate = new Date().toLocaleDateString('nl-NL');
  const lhLabel = lhData?.loonheffing_toepassen === 'ja' ? 'Ja' : lhData?.loonheffing_toepassen === 'nee' ? 'Nee' : 'Niet ingevuld';
  const signatureUrl = lhData?.loonheffing_handtekening_url || emp.loonheffing_handtekening_url || null;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Stamkaart - ${fullName}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:720px;margin:0 auto;padding:20px;font-size:12px;line-height:1.4}
.section{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#334155;border-bottom:1px solid #e2e8f0;padding:6px 0 1px;margin-top:10px}
table{width:100%;border-collapse:collapse}td{padding:2px 4px;font-size:12px}
.label{color:#475569;width:240px;text-align:right;padding-right:8px}.val{color:#1e293b}
.header{border-bottom:2px solid #1e293b;padding-bottom:8px;margin-bottom:24px;overflow:hidden}
.footer{margin-top:16px;padding-top:4px;border-top:1px solid #e2e8f0;text-align:center;font-size:9px;color:#94a3b8}
@media print{body{padding:10mm}}</style></head><body>
<div class="header"><div style="float:right;text-align:right;font-size:9px;color:#64748b"><strong style="color:#334155">Interdistri B.V.</strong><br>Fleerbosseweg 19, 4421 RR Kapelle<br>K.v.K. nr: 20150449<br>Datum: ${printDate}</div><strong style="font-size:14px">Stamkaart werknemers</strong><br>
<span style="color:#475569">${fullName} — Nr. ${emp.employee_number || '—'}</span></div>

<div class="section">Werknemer gegevens</div>
<table>
<tr><td class="label">Voorletters</td><td class="val">${emp.initials || '—'}</td></tr>
<tr><td class="label">Voornaam</td><td class="val">${emp.first_name || '—'}</td></tr>
<tr><td class="label">Tussenvoegsel</td><td class="val">${emp.prefix || '—'}</td></tr>
<tr><td class="label">Achternaam</td><td class="val">${emp.last_name || '—'}</td></tr>
<tr><td class="label">Geboortedatum</td><td class="val">${fmtDate(emp.date_of_birth)}</td></tr>
<tr><td class="label">Adres</td><td class="val">${emp.address || '—'}</td></tr>
<tr><td class="label">Postcode en woonplaats</td><td class="val">${emp.postal_code || ''} ${emp.city || ''}</td></tr>
<tr><td class="label">E-mailadres</td><td class="val">${emp.email || '—'}</td></tr>
<tr><td class="label">Telefoon</td><td class="val">${emp.phone || '—'}</td></tr>
<tr><td class="label">IBAN</td><td class="val">${emp.bank_account || '—'}</td></tr>
<tr><td class="label">Noodcontact</td><td class="val">${emp.emergency_contact_name || '—'} ${emp.emergency_contact_phone || ''}</td></tr>
</table>

<div class="section">Identiteitsbewijs</div>
<table>
<tr><td class="label">BSN</td><td class="val">${emp.bsn || '—'}</td></tr>
<tr><td class="label">Nr. ID-kaart/paspoort</td><td class="val">${emp.id_document_number || '—'}</td></tr>
<tr><td class="label">Geldig tot</td><td class="val">${fmtDate(emp.id_document_expiry)}</td></tr>
</table>

<div class="section">Rijbewijs</div>
<table>
<tr><td class="label">Rijbewijsnummer</td><td class="val">${emp.drivers_license_number || '—'}</td></tr>
<tr><td class="label">Categorieën</td><td class="val">${cats}</td></tr>
<tr><td class="label">Vervaldatum rijbewijs</td><td class="val">${fmtDate(emp.drivers_license_expiry)}</td></tr>
<tr><td class="label">Vervaldatum Code 95</td><td class="val">${fmtDate(emp.code95_expiry)}</td></tr>
</table>

<div class="section">Gegevens dienstverband</div>
<table>
<tr><td class="label">Datum in dienst</td><td class="val">${fmtDate(emp.in_service_since)}</td></tr>
<tr><td class="label">Functie</td><td class="val">${emp.function || '—'}</td></tr>
<tr><td class="label">Afdeling</td><td class="val">${emp.department || '—'}</td></tr>
<tr><td class="label">Contract type</td><td class="val">${emp.contract_type || '—'}</td></tr>
<tr><td class="label">Contracturen</td><td class="val">${emp.contract_hours ? emp.contract_hours + ' uur' : '—'}</td></tr>
<tr><td class="label">Loonschaal</td><td class="val">${emp.salary_scale || '—'}</td></tr>
<tr><td class="label">Bruto uurloon</td><td class="val">${emp.hourly_rate ? '€ ' + Number(emp.hourly_rate).toFixed(2) : '—'}</td></tr>
</table>

<div class="section">Loonheffingskorting</div>
<table>
<tr><td class="label">Loonheffingskorting?</td><td class="val">${lhLabel}</td></tr>
${lhData?.loonheffing_datum ? `<tr><td class="label">Vanaf datum</td><td class="val">${fmtDate(lhData.loonheffing_datum)}</td></tr>` : ''}
</table>
${signatureUrl ? `<div style="margin-top:8px"><span style="font-size:11px;color:#475569">Handtekening:</span><br><img src="${signatureUrl}" style="max-height:80px;border:1px solid #e2e8f0;margin-top:4px" /></div>` : ''}

<div class="footer">Dit document is vertrouwelijk. Gegenereerd via beveiligde link op ${printDate}. Link verloopt na ${TOKEN_EXPIRY_HOURS} uur.</div>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── GENERATE TOKEN ──
    if (action === 'generate') {
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { type, employee_id } = body;
      if (!type || !employee_id) {
        return Response.json({ error: 'Missing type or employee_id' }, { status: 400 });
      }

      const token = generateToken();
      const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.SecureDownloadToken.create({
        token,
        type,
        employee_id,
        expires_at: expiresAt,
        used: false,
        download_count: 0,
        created_by_email: user.email,
        created_by_name: user.full_name,
      });

      // Audit
      try {
        await base44.functions.invoke('auditService', {
          entity_type: 'SecureDownloadToken',
          action_type: 'create',
          category: 'Security',
          description: `Secure download token aangemaakt (${type}) voor employee ${employee_id}`,
          performed_by_email: user.email,
          performed_by_name: user.full_name,
          performed_by_role: user.role,
          metadata: { type, employee_id, expires_at: expiresAt },
        });
      } catch (_) {}

      return Response.json({ success: true, token, expires_at: expiresAt });
    }

    // ── DOWNLOAD (validate token + serve HTML) — NO AUTH REQUIRED ──
    if (action === 'download') {
      const { token } = body;
      if (!token) return Response.json({ error: 'Missing token' }, { status: 400 });

      console.log(`[secureDownload] Looking up token: ${token.substring(0, 8)}...`);

      // Find token — always use service role (download is public, no user auth needed)
      const svc = base44.asServiceRole;
      let tokens = [];
      try {
        tokens = await svc.entities.SecureDownloadToken.filter({ token });
      } catch (filterErr) {
        console.error(`[secureDownload] Token filter error: ${filterErr.message}`);
        // Fallback: list all and find manually
        const allTokens = await svc.entities.SecureDownloadToken.list('-created_date', 200);
        tokens = allTokens.filter(t => t.token === token);
        console.log(`[secureDownload] Fallback search found ${tokens.length} match(es) from ${allTokens.length} total tokens`);
      }

      console.log(`[secureDownload] Token found: ${tokens.length > 0 ? JSON.stringify({ id: tokens[0]?.id, type: tokens[0]?.type, employee_id: tokens[0]?.employee_id, expires_at: tokens[0]?.expires_at, download_count: tokens[0]?.download_count }) : 'NONE'}`);

      if (tokens.length === 0) {
        return Response.json({ error: 'Token niet gevonden of ongeldig' }, { status: 404 });
      }

      const tokenRecord = tokens[0];

      // Check expiry
      if (new Date(tokenRecord.expires_at) < new Date()) {
        return Response.json({ error: 'Deze link is verlopen. Vraag een nieuwe link aan bij uw contactpersoon.' }, { status: 410 });
      }

      // Rate limit: use max_downloads if set, fallback to 10
      const maxDownloads = tokenRecord.max_downloads || 10;
      if (tokenRecord.download_count >= maxDownloads) {
        return Response.json({ error: 'Download limiet bereikt voor deze link.' }, { status: 429 });
      }

      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

      // Increment download count + log IP
      await svc.entities.SecureDownloadToken.update(tokenRecord.id, {
        download_count: (tokenRecord.download_count || 0) + 1,
        used: true,
        ip_address: ip,
      });

      // Fetch employee with decrypted sensitive fields
      let emp;
      try {
        emp = await svc.entities.Employee.get(tokenRecord.employee_id);
      } catch (empErr) {
        console.error(`[secureDownload] Employee not found: ${tokenRecord.employee_id} - ${empErr.message}`);
        return Response.json({ error: 'Medewerker niet gevonden. Het account is mogelijk verwijderd.' }, { status: 404 });
      }
      if (emp.bsn) emp.bsn = await decrypt(emp.bsn);
      if (emp.bank_account) emp.bank_account = await decrypt(emp.bank_account);

      let html = '';
      if (tokenRecord.type === 'stamkaart') {
        html = buildStamkaartHtml(emp, emp);
      } else if (tokenRecord.type === 'onboarding') {
        html = buildStamkaartHtml(emp, emp);
      } else if (tokenRecord.type === 'id_document') {
        // Serve document file preview for ID documents — PRIVATE STORAGE with signed URLs
        const docId = tokenRecord.document_id;
        if (!docId) {
          return Response.json({ error: 'Geen document gekoppeld aan dit token.' }, { status: 400 });
        }
        let doc;
        try {
          doc = await svc.entities.Document.get(docId);
        } catch (_) {
          return Response.json({ error: 'Document niet gevonden.' }, { status: 404 });
        }

        // SECURITY: Enforce private storage only — no legacy file_url fallback
        if (!doc.file_uri) {
          try {
            await svc.entities.AuditLog.create({
              action_type: 'tamper_attempt_update',
              category: 'Security',
              description: `SecureDownload BLOCKED — document ${docId} missing private file_uri (legacy public storage rejected)`,
              performed_by_email: tokenRecord.created_by_email || 'external',
              metadata: { document_id: docId, token: token.substring(0, 8) + '...' },
            });
          } catch (_) {}
          return Response.json({ error: 'Document mist beveiligde opslag. Neem contact op met de beheerder.' }, { status: 403 });
        }

        // SECURITY: Block unencrypted ID documents
        if (tokenRecord.type === 'id_document' && !doc.encrypted) {
          try {
            await svc.entities.AuditLog.create({
              action_type: 'tamper_attempt_update',
              category: 'Security',
              description: `SecureDownload BLOCKED — unencrypted ID document ${docId}`,
              performed_by_email: tokenRecord.created_by_email || 'external',
              metadata: { document_id: docId, token: token.substring(0, 8) + '...' },
            });
          } catch (_) {}
          return Response.json({ error: 'Onversleuteld ID-document geblokkeerd.' }, { status: 403 });
        }

        const signedResult = await svc.integrations.Core.CreateFileSignedUrl({
          file_uri: doc.file_uri,
          expires_in: 300,
        });
        const fileUrl = signedResult.signed_url;

        const fullName = `${emp.first_name || ''} ${emp.prefix ? emp.prefix + ' ' : ''}${emp.last_name || ''}`.trim();
        const fileName = doc.name || '';
        const isImage = /\.(jpg|jpeg|png|gif|webp)/i.test(fileName) || /\.(jpg|jpeg|png|gif|webp)/i.test(fileUrl);
        const isPdf = /\.pdf/i.test(fileName) || /\.pdf/i.test(fileUrl);
        html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ID Document - ${fullName}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:800px;margin:0 auto;padding:20px;background:#f8fafc}
.header{background:#1e293b;color:white;padding:16px 24px;border-radius:8px 8px 0 0;margin-bottom:0}
.content{background:white;border:1px solid #e2e8f0;padding:24px;border-radius:0 0 8px 8px}
.meta{display:flex;gap:24px;margin-bottom:16px;font-size:13px;color:#475569}
.meta strong{color:#1e293b}
.doc-preview{text-align:center;padding:20px;background:#f1f5f9;border-radius:8px;border:1px solid #e2e8f0}
.footer{text-align:center;font-size:10px;color:#94a3b8;margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0}
img.doc-img{max-width:100%;max-height:600px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
</style></head><body>
<div class="header"><h2 style="margin:0;font-size:16px">🔒 Vertrouwelijk ID-document</h2></div>
<div class="content">
  <div class="meta">
    <div><strong>Medewerker:</strong> ${fullName}</div>
    <div><strong>Type:</strong> ${doc.document_type || '—'}</div>
    <div><strong>Document:</strong> ${doc.name || '—'}</div>
  </div>
  <div class="doc-preview">
    ${isImage ? `<img class="doc-img" src="${fileUrl}" alt="ID Document" />` : 
      isPdf ? `<iframe src="${fileUrl}" style="width:100%;height:600px;border:none;border-radius:4px" title="PDF Preview"></iframe>` :
      `<p style="color:#475569">Document beschikbaar: <a href="${fileUrl}" target="_blank" style="color:#1d4ed8;font-weight:600">Download bestand</a></p>`}
  </div>
  <div class="footer">
    <p>⚠️ Dit document bevat vertrouwelijke persoonsgegevens. Niet delen met onbevoegden.</p>
    <p>Download ${tokenRecord.download_count + 1} van maximaal ${maxDownloads}. Link verloopt op ${new Date(tokenRecord.expires_at).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}.</p>
    <p style="font-size:9px;color:#cbd5e1;margin-top:4px">Bestandstoegang verloopt automatisch na 5 minuten.</p>
  </div>
</div></body></html>`;
      }

      // Audit download — use service role (no user auth in download flow)
      try {
        await svc.entities.AuditLog.create({
          action_type: 'download',
          category: 'Security',
          description: `Secure download uitgevoerd (${tokenRecord.type}) voor employee ${tokenRecord.employee_id}`,
          performed_by_email: tokenRecord.created_by_email || 'external',
          metadata: { type: tokenRecord.type, employee_id: tokenRecord.employee_id, ip, download_count: tokenRecord.download_count + 1 },
        });
      } catch (_) {}

      return Response.json({ success: true, html });
    }

    return Response.json({ error: 'Unknown action. Use: generate, download' }, { status: 400 });
  } catch (error) {
    console.error('secureDownload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});