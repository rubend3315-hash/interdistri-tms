/**
 * Generates a professionally styled HTML email body for a stamkaart.
 * @param {object} params
 * @param {string} params.fullName
 * @param {object} params.data - Employee data fields
 * @param {string} params.lhLabel - Loonheffingskorting label (Ja/Nee/Niet ingevuld)
 * @param {string} params.lhDatum - Loonheffing datum
 * @param {string} [params.signatureUrl] - URL of the signature image
 * @returns {string} HTML string
 */
export function buildStamkaartEmailHtml({ fullName, data, lhLabel, lhDatum, signatureUrl, managerName }) {
  const row = (label, value) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#334155;width:220px;font-size:14px;">${label}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#1e293b;font-size:14px;">${value || '—'}</td>
    </tr>`;

  const section = (title, rows) => `
    <tr>
      <td colspan="2" style="padding:16px 14px 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#3b82f6;border-bottom:2px solid #3b82f6;">
        ${title}
      </td>
    </tr>
    ${rows}`;

  const signatureHtml = signatureUrl ? `
    <div style="margin-top:24px;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#334155;">Handtekening loonheffingsverklaring:</p>
      <img src="${signatureUrl}" alt="Handtekening" style="max-height:80px;border:1px solid #cbd5e1;border-radius:4px;background:#fff;padding:4px;" />
    </div>` : '';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af 0%,#2563eb 100%);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">🚛 Interdistri</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#bfdbfe;">Transport Management Systeem</p>
    </div>

    <!-- Title bar -->
    <div style="background:#1e293b;padding:14px 32px;">
      <h2 style="margin:0;font-size:16px;font-weight:600;color:#ffffff;">Stamkaart — ${fullName}</h2>
      <p style="margin:2px 0 0;font-size:12px;color:#94a3b8;">Gegenereerd op ${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </div>

    <!-- Content -->
    <div style="background:#ffffff;padding:0;border-radius:0 0 12px 12px;overflow:hidden;border:1px solid #e2e8f0;border-top:none;">
      <table style="width:100%;border-collapse:collapse;">
        ${section('Persoonsgegevens', [
          row('Naam', fullName),
          row('Geboortedatum', data.date_of_birth),
          row('BSN', data.bsn),
          row('Adres', `${data.address || '—'}, ${data.postal_code || ''} ${data.city || ''}`),
          row('E-mail', data.email),
          row('Telefoon', data.phone),
          row('IBAN', data.bank_account),
        ].join(''))}

        ${section('Identificatie & Rijbewijs', [
          row('ID-document nummer', data.id_document_number),
          row('ID-document geldig t/m', data.id_document_expiry),
          row('Rijbewijsnummer', data.drivers_license_number),
          row('Rijbewijscategorieën', Array.isArray(data.drivers_license_categories) ? data.drivers_license_categories.join(', ') : data.drivers_license_categories),
          row('Rijbewijs vervaldatum', data.drivers_license_expiry),
          row('Code 95 vervaldatum', data.code95_expiry),
        ].join(''))}

        ${section('Dienstverband', [
          row('Afdeling', data.department),
          row('Functie', data.function),
          row('Contract type', data.contract_type),
          row('Uren per week', data.contract_hours),
          row('Loonschaal', data.salary_scale),
          row('Bruto uurloon', data.hourly_rate ? `€ ${data.hourly_rate}` : '—'),
          row('In dienst sinds', data.in_service_since),
        ].join(''))}

        ${section('Loonheffingsverklaring', [
          row('Loonheffingskorting toepassen', lhLabel),
          row('Datum', lhDatum),
        ].join(''))}
      </table>

      ${signatureHtml}

      <!-- Footer inside card -->
      <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:11px;color:#94a3b8;">Dit document is vertrouwelijk en uitsluitend bestemd voor de loonadministratie.</p>
      </div>
    </div>

    <!-- Outer footer -->
    <div style="text-align:center;padding:16px 0;">
      <p style="margin:0;font-size:11px;color:#94a3b8;">Interdistri TMS • Automatisch gegenereerd</p>
    </div>
  </div>
</body>
</html>`;
}