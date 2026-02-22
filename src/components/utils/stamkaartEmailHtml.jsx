/**
 * Generates a clean, professional HTML document for a stamkaart.
 * Used as email body for payroll administration.
 * Matches the StamkaartPrintView layout — official document quality, no UI elements.
 *
 * @param {object} params
 * @param {string} params.fullName
 * @param {object} params.data - Employee data fields
 * @param {string} params.lhLabel - Loonheffingskorting label (Ja/Nee/Niet ingevuld)
 * @param {string} params.lhDatum - Loonheffing datum
 * @param {string} [params.signatureUrl] - URL of the signature image
 * @param {string} [params.managerName]
 * @returns {string} HTML string
 */
export function buildStamkaartEmailHtml({ fullName, data, lhLabel, lhDatum, signatureUrl, managerName }) {
  const fmtDate = (val) => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
    } catch { return val; }
  };

  const cats = Array.isArray(data.drivers_license_categories)
    ? data.drivers_license_categories.join(', ')
    : (data.drivers_license_categories || '—');

  const sectionTitle = (title) => `
    <tr>
      <td colspan="2" style="padding:8px 0 2px 0;border-bottom:1px solid #334155;">
        <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#334155;">${title}</span>
      </td>
    </tr>`;

  const row = (label, value, labelWidth) => {
    const w = labelWidth || 220;
    return `
    <tr>
      <td style="padding:3px 8px 3px 0;font-size:12px;color:#475569;width:${w}px;text-align:right;white-space:nowrap;">${label}</td>
      <td style="padding:3px 0;font-size:12px;color:#1e293b;">${value || '—'}</td>
    </tr>`;
  };

  const compactRow = (label, value) => row(label, value, 150);

  const printDate = new Date().toLocaleDateString('nl-NL');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:680px;margin:0 auto;padding:20px 16px;">

    <!-- Document Header -->
    <table style="width:100%;border-bottom:2px solid #1e293b;margin-bottom:6px;">
      <tr>
        <td style="padding-bottom:2px;">
          <span style="font-size:14px;font-weight:700;color:#1e293b;">Stamkaart werknemers — ${fullName}</span>
        </td>
        <td style="padding-bottom:2px;text-align:right;">
          <span style="font-size:11px;color:#64748b;">Nr. ${data.employee_number || '—'}</span>
        </td>
      </tr>
    </table>

    <!-- Company info -->
    <table style="width:100%;margin-bottom:8px;">
      <tr>
        <td style="font-size:10px;color:#64748b;text-align:right;">
          Interdistri B.V. &bull; Fleerbosseweg 19, 4421 RR Kapelle &bull; K.v.K. 20150449 &bull; Datum: ${printDate}
        </td>
      </tr>
    </table>

    <!-- Werknemer gegevens -->
    <table style="width:100%;border-collapse:collapse;">
      ${sectionTitle('Werknemer gegevens')}
      ${row('Voorletters', data.initials)}
      ${row('Voornaam', data.first_name)}
      ${row('Tussenvoegsel', data.prefix)}
      ${row('Achternaam', data.last_name)}
      ${row('Geboortedatum', fmtDate(data.date_of_birth))}
      ${row('Adres', data.address)}
      ${row('Postcode en woonplaats', `${data.postal_code || ''} ${data.city || ''}`)}
      ${row('E-mailadres', data.email)}
      ${row('Telefoon', data.phone)}
      ${row('IBAN', data.bank_account)}
      ${row('Noodcontact', `${data.emergency_contact_name || '—'} ${data.emergency_contact_phone || ''}`)}
    </table>

    <!-- Identiteitsbewijs -->
    <table style="width:100%;border-collapse:collapse;margin-top:4px;">
      ${sectionTitle('Identiteitsbewijs')}
      ${row('Burger Service Nummer', data.bsn)}
      ${row('Nr. ID-kaart/paspoort', data.id_document_number)}
      ${row('Geldig tot', fmtDate(data.id_document_expiry))}
    </table>

    <!-- Rijbewijs -->
    <table style="width:100%;border-collapse:collapse;margin-top:4px;">
      ${sectionTitle('Rijbewijs')}
      ${row('Rijbewijsnummer', data.drivers_license_number)}
      ${row('Categorieën', cats)}
      ${row('Vervaldatum rijbewijs', fmtDate(data.drivers_license_expiry))}
      ${row('Vervaldatum Code 95', fmtDate(data.code95_expiry))}
    </table>

    <!-- Dienstverband -->
    <table style="width:100%;border-collapse:collapse;margin-top:4px;">
      ${sectionTitle('Gegevens dienstverband')}
    </table>
    <table style="width:100%;border-collapse:collapse;">
      <tr valign="top">
        <td style="width:50%;">
          <table style="width:100%;border-collapse:collapse;">
            ${compactRow('Datum in dienst', fmtDate(data.in_service_since))}
            ${compactRow('Functie', data.function)}
            ${compactRow('Afdeling', data.department)}
          </table>
        </td>
        <td style="width:50%;">
          <table style="width:100%;border-collapse:collapse;">
            ${compactRow('Contract type', data.contract_type)}
            ${compactRow('Contracturen', data.contract_hours ? `${data.contract_hours} uur` : '—')}
            ${compactRow('Loonschaal', data.salary_scale)}
            ${compactRow('Bruto uurloon', data.hourly_rate ? `€ ${Number(data.hourly_rate).toFixed(2)}` : '—')}
          </table>
        </td>
      </tr>
    </table>

    <!-- Loonheffingsverklaring -->
    <table style="width:100%;border-collapse:collapse;margin-top:4px;">
      ${sectionTitle('Loonheffingskorting & ondertekening')}
    </table>
    <table style="width:100%;border-collapse:collapse;">
      <tr valign="top">
        <td style="width:60%;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:3px 0;font-size:12px;color:#475569;width:45%;">Loonheffingskorting?</td>
              <td style="padding:3px 0;font-size:12px;color:#1e293b;">${lhLabel}</td>
            </tr>
            ${lhDatum && lhDatum !== '—' ? `
            <tr>
              <td style="padding:3px 0;font-size:12px;color:#475569;">Vanaf datum</td>
              <td style="padding:3px 0;font-size:12px;color:#1e293b;">${fmtDate(lhDatum)}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:3px 0;font-size:12px;color:#475569;">LKV (WW, WAO, WIA)?</td>
              <td style="padding:3px 0;font-size:12px;color:#1e293b;">${data.lkv_uitkering === 'ja' ? 'Ja, doelgroepverklaring' : 'Nee'}</td>
            </tr>
            ${data.financiele_situatie ? `
            <tr>
              <td style="padding:3px 0;font-size:12px;color:#475569;vertical-align:top;">Bijzonderheden</td>
              <td style="padding:3px 0;font-size:12px;color:#1e293b;white-space:pre-wrap;">${data.financiele_situatie}</td>
            </tr>` : ''}
          </table>
        </td>
        <td style="width:40%;padding-left:16px;">
          <div style="font-size:12px;color:#475569;margin-bottom:4px;">Handtekening werknemer</div>
          ${signatureUrl
            ? `<img src="${signatureUrl}" alt="Handtekening" style="max-height:80px;border:1px solid #cbd5e1;background:#fff;padding:4px;display:block;" />`
            : `<div style="height:80px;border:1px solid #cbd5e1;background:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;color:#94a3b8;">Niet getekend</div>`
          }
        </td>
      </tr>
    </table>

    ${managerName ? `
    <div style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 2px;font-size:12px;color:#334155;">Met vriendelijke groet,</p>
      <p style="margin:0;font-size:13px;font-weight:600;color:#1e293b;">${managerName}</p>
      <p style="margin:2px 0 0;font-size:11px;color:#64748b;">Interdistri B.V.</p>
    </div>` : ''}

    <!-- Footer -->
    <div style="margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="margin:0;font-size:10px;color:#94a3b8;">Dit document is vertrouwelijk en uitsluitend bestemd voor de loonadministratie.</p>
    </div>
  </div>
</body>
</html>`;
}