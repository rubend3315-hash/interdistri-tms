/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║ buildStamkaartEmailHtml — HTML EQUIVALENT OF PrintView     ║
 * ║                                                            ║
 * ║ Deze functie genereert een inline-styled HTML document      ║
 * ║ dat EXACT dezelfde secties, veldvolgorde en structuur       ║
 * ║ volgt als StamkaartPrintView.jsx.                          ║
 * ║                                                            ║
 * ║ Bij wijzigingen in StamkaartPrintView MOET deze functie    ║
 * ║ ook worden bijgewerkt (en vice versa).                     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Secties (in volgorde):
 * 1. Document header (naam + nr + bedrijfsinfo)
 * 2. Werknemer gegevens
 * 3. Identiteitsbewijs
 * 4. Rijbewijs (gesplitste vervaldatums)
 * 5. Gegevens dienstverband (2-koloms)
 * 6. Loonheffingskorting & ondertekening (+ handtekening)
 * 7. Footer
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

  const printDate = new Date().toLocaleDateString('nl-NL');

  // ── Helpers matching PrintView structure ──
  const sectionTitle = (title) => `
    <tr>
      <td colspan="2" style="padding:6px 0 1px 0;border-bottom:1px solid #e2e8f0;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#334155;">${title}</span>
      </td>
    </tr>`;

  const row = (label, value, labelWidth) => {
    const w = labelWidth || 240;
    return `
    <tr>
      <td style="padding:2px 8px 2px 0;font-size:13px;color:#475569;width:${w}px;text-align:right;white-space:nowrap;line-height:1.3;">${label}</td>
      <td style="padding:2px 0;font-size:12px;color:#1e293b;line-height:1.3;">${value || '—'}</td>
    </tr>`;
  };

  const compactRow = (label, value) => row(label, value, 150);

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:720px;margin:0 auto;padding:20px 16px;font-size:10pt;line-height:1.35;">

<!-- ═══ DOCUMENT HEADER ═══ -->
<table style="width:100%;border-bottom:2px solid #1e293b;margin-bottom:4px;">
  <tr>
    <td style="padding-bottom:2px;">
      <span style="font-size:14px;font-weight:700;color:#1e293b;">Stamkaart werknemers</span><br/>
      <span style="font-size:12px;color:#475569;">${fullName} — Nr. ${data.employee_number || '—'}</span>
    </td>
    <td style="padding-bottom:2px;text-align:right;vertical-align:top;">
      <div style="font-size:9px;color:#64748b;line-height:1.4;">
        <div style="font-weight:600;color:#334155;">Interdistri B.V.</div>
        <div>Fleerbosseweg 19, 4421 RR Kapelle</div>
        <div>K.v.K. nr: 20150449</div>
        <div>Afdrukdatum: ${printDate}</div>
      </div>
    </td>
  </tr>
</table>

<!-- ═══ WERKNEMER GEGEVENS ═══ -->
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
  ${row('Noodcontact (naam / telefoon)', `${data.emergency_contact_name || '—'} ${data.emergency_contact_phone || ''}`)}
</table>

<!-- ═══ IDENTITEITSBEWIJS ═══ -->
<table style="width:100%;border-collapse:collapse;">
  ${sectionTitle('Identiteitsbewijs')}
  ${row('Burger Service Nummer', data.bsn)}
  ${row('Nr. ID-kaart/paspoort', data.id_document_number)}
  ${row('Geldig tot', fmtDate(data.id_document_expiry))}
</table>

<!-- ═══ RIJBEWIJS ═══ -->
<table style="width:100%;border-collapse:collapse;">
  ${sectionTitle('Rijbewijs')}
  ${row('Rijbewijsnummer', data.drivers_license_number)}
  ${row('Categorieën', cats)}
  ${row('Vervaldatum rijbewijs', fmtDate(data.drivers_license_expiry))}
  ${row('Vervaldatum Code 95', fmtDate(data.code95_expiry))}
</table>

<!-- ═══ GEGEVENS DIENSTVERBAND ═══ -->
<table style="width:100%;border-collapse:collapse;">
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
        ${compactRow('Bruto uurloon (€)', data.hourly_rate ? `€ ${Number(data.hourly_rate).toFixed(2)}` : '—')}
      </table>
    </td>
  </tr>
</table>

<!-- ═══ LOONHEFFINGSKORTING & ONDERTEKENING ═══ -->
<table style="width:100%;border-collapse:collapse;">
  ${sectionTitle('Loonheffingskorting & ondertekening')}
</table>
<table style="width:100%;border-collapse:collapse;">
  <tr valign="top">
    <td style="width:60%;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:2px 0;font-size:12px;color:#475569;width:45%;">Loonheffingskorting?</td>
          <td style="padding:2px 0;font-size:12px;color:#1e293b;">${lhLabel}</td>
        </tr>
        ${lhDatum && lhDatum !== '—' ? `
        <tr>
          <td style="padding:2px 0;font-size:12px;color:#475569;">Vanaf datum</td>
          <td style="padding:2px 0;font-size:12px;color:#1e293b;">${fmtDate(lhDatum)}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:2px 0;font-size:12px;color:#475569;">LKV (WW, WAO, WIA)?</td>
          <td style="padding:2px 0;font-size:12px;color:#1e293b;">${data.lkv_uitkering === 'ja' ? 'Ja, doelgroepverklaring' : 'Nee'}</td>
        </tr>
        <tr>
          <td style="padding:2px 0;font-size:12px;color:#475569;vertical-align:top;">Bijzonderheden</td>
          <td style="padding:2px 0;font-size:12px;color:#1e293b;white-space:pre-wrap;border:1px solid rgba(148,163,184,0.4);min-height:100px;padding:6px 8px;">${data.financiele_situatie || '—'}</td>
        </tr>
      </table>
    </td>
    <td style="width:40%;padding-left:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
        <span style="font-size:12px;color:#475569;">Handtekening werknemer</span>
        <span style="font-size:11px;color:#64748b;">Datum: ${lhDatum && lhDatum !== '—' ? fmtDate(lhDatum) : printDate}</span>
      </div>
      ${signatureUrl
        ? `<img src="${signatureUrl}" alt="Handtekening" style="max-height:80px;width:100%;object-fit:contain;border:1px solid rgba(148,163,184,0.4);background:#fff;display:block;" />`
        : `<div style="height:80px;border:1px solid rgba(148,163,184,0.4);background:#fff;text-align:center;line-height:80px;font-size:12px;color:#94a3b8;font-style:italic;">Niet getekend</div>`
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

<!-- ═══ FOOTER ═══ -->
<div style="margin-top:8px;padding-top:4px;border-top:1px solid #e2e8f0;text-align:center;">
  <span style="font-size:9px;color:#94a3b8;">Dit document is vertrouwelijk en uitsluitend bestemd voor de loonadministratie.</span>
</div>

</div>
</body>
</html>`;
}